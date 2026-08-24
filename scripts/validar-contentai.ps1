param(
    [string]$ProjectPath = (Get-Location).Path,
    [switch]$RunBuild
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

function Result {
    param(
        [string]$Label,
        [bool]$Ok,
        [string]$Detail = ""
    )

    $Prefix =
        if ($Ok) {
            "[OK]"
        }
        else {
            "[ERROR]"
        }

    $Color =
        if ($Ok) {
            "Green"
        }
        else {
            "Red"
        }

    Write-Host (
        $Prefix + " " + $Label
    ) -ForegroundColor $Color

    if ($Detail) {
        Write-Host (
            "      " + $Detail
        ) -ForegroundColor DarkGray
    }
}

try {
    if (-not (Test-Path -LiteralPath $ProjectPath)) {
        throw "Proyecto no encontrado."
    }

    $RootPath =
        (Resolve-Path -LiteralPath $ProjectPath).Path

    $RequiredRelativePaths = @(
        "package.json",
        "app\protected\layout.tsx",
        "components\protected-shell.tsx",
        "lib\supabase\admin.ts",
        "lib\social\publisher.ts",
        "lib\social\scheduler-runner.ts",
        "lib\social\metrics-sync.ts",
        "app\api\cron\publications\route.ts",
        "app\api\cron\metrics\route.ts"
    )

    $Failed = $false

    foreach ($RelativePath in $RequiredRelativePaths) {
        $AbsolutePath =
            Join-Path $RootPath $RelativePath

        $Ok =
            Test-Path -LiteralPath $AbsolutePath

        Result `
            -Label $RelativePath `
            -Ok $Ok

        if (-not $Ok) {
            $Failed = $true
        }
    }

    $EnvPath =
        Join-Path $RootPath ".env.local"

    $EnvExists =
        Test-Path -LiteralPath $EnvPath

    Result `
        -Label ".env.local" `
        -Ok $EnvExists

    if (-not $EnvExists) {
        $Failed = $true
    }
    else {
        $EnvText =
            [System.IO.File]::ReadAllText($EnvPath)

        $HasUrl =
            $EnvText -match "(?m)^NEXT_PUBLIC_SUPABASE_URL=\S+"

        $HasPublicKey =
            (
                $EnvText -match "(?m)^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=\S+"
            ) -or (
                $EnvText -match "(?m)^NEXT_PUBLIC_SUPABASE_ANON_KEY=\S+"
            )

        $HasSecretKey =
            $EnvText -match "(?m)^SUPABASE_SECRET_KEY=\S+"

        Result `
            -Label "Supabase URL" `
            -Ok $HasUrl

        Result `
            -Label "Supabase public key" `
            -Ok $HasPublicKey

        Result `
            -Label "Supabase server secret" `
            -Ok $HasSecretKey `
            -Detail "El valor no se muestra."

        if (
            -not $HasUrl -or
            -not $HasPublicKey -or
            -not $HasSecretKey
        ) {
            $Failed = $true
        }

        $DangerousPublicSecret =
            $EnvText -match "(?mi)^NEXT_PUBLIC_.*(SECRET|SERVICE_ROLE).*="

        Result `
            -Label "Sin secretos server-side expuestos con NEXT_PUBLIC_" `
            -Ok (-not $DangerousPublicSecret)

        if ($DangerousPublicSecret) {
            $Failed = $true
        }
    }

    $SearchRoots = @(
        (Join-Path $RootPath "app"),
        (Join-Path $RootPath "components"),
        (Join-Path $RootPath "lib")
    )

    $DangerPatterns = @(
        "NEXT_PUBLIC_SUPABASE_SECRET_KEY",
        "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE",
        "vault.decrypted_secrets"
    )

    foreach ($DangerPattern in $DangerPatterns) {
        $Found =
            $false

        foreach ($SearchRoot in $SearchRoots) {
            if (-not (Test-Path -LiteralPath $SearchRoot)) {
                continue
            }

            $Files =
                Get-ChildItem `
                    -LiteralPath $SearchRoot `
                    -Recurse `
                    -File `
                    -Include *.ts,*.tsx,*.js,*.jsx

            foreach ($File in $Files) {
                $Text =
                    [System.IO.File]::ReadAllText(
                        $File.FullName
                    )

                if ($Text.Contains($DangerPattern)) {
                    if (
                        $DangerPattern -eq "vault.decrypted_secrets" -and
                        $File.FullName -match "lib\\supabase\\admin"
                    ) {
                        continue
                    }

                    $Found = $true
                    break
                }
            }

            if ($Found) {
                break
            }
        }

        Result `
            -Label ("Patron peligroso: " + $DangerPattern) `
            -Ok (-not $Found)

        if ($Found) {
            $Failed = $true
        }
    }

    if ($RunBuild) {
        Write-Host ""
        Write-Host "Ejecutando npm run build..." -ForegroundColor Cyan

        Push-Location $RootPath

        try {
            & npm run build

            if ($LASTEXITCODE -ne 0) {
                throw "npm run build devolvio codigo $LASTEXITCODE."
            }

            Result `
                -Label "npm run build" `
                -Ok $true
        }
        finally {
            Pop-Location
        }
    }
    else {
        Write-Host ""
        Write-Host "Build no ejecutado. Para incluirlo:" -ForegroundColor Yellow
        Write-Host (
            'powershell -ExecutionPolicy Bypass -File "' +
            $MyInvocation.MyCommand.Path +
            '" -ProjectPath "' +
            $RootPath +
            '" -RunBuild'
        )
    }

    Write-Host ""

    if ($Failed) {
        Write-Host "VALIDACION COMPLETADA CON INCIDENCIAS" -ForegroundColor Yellow
        exit 2
    }

    Write-Host "VALIDACION CONTENTAI CORRECTA" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "VALIDACION DETENIDA" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}