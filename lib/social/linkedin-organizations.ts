import {
  storeSocialConnection,
} from "@/lib/social/server";

const LINKEDIN_API_VERSION =
  "202607";

type OrganizationAcl = {
  organization?: string;
  organizationTarget?: string;
  role?: string;
  state?: string;
};

type OrganizationAclsResponse = {
  elements?: OrganizationAcl[];
};

type OrganizationResponse = {
  id?: number | string;
  localizedName?: string;
  vanityName?: string;
};

function headers(
  accessToken: string
) {
  return {
    Authorization:
      `Bearer ${accessToken}`,
    "X-Restli-Protocol-Version":
      "2.0.0",
    "Linkedin-Version":
      LINKEDIN_API_VERSION,
    "Content-Type":
      "application/json",
  };
}

function organizationIdFromUrn(
  urn: string
) {
  const parts =
    urn.split(":");

  return (
    parts[
      parts.length -
      1
    ] ?? ""
  ).trim();
}

export async function discoverAndStoreLinkedInOrganizations({
  accessToken,
  scopes,
  connectedBy,
}: {
  accessToken: string;
  scopes: string[];
  connectedBy: string;
}) {
  if (
    !scopes.includes(
      "rw_organization_admin"
    ) &&
    !scopes.includes(
      "r_organization_admin"
    )
  ) {
    return {
      discovered:
        0,
      available:
        false,
    };
  }

  let response:
    Response;

  try {
    response =
      await fetch(
        "https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&state=APPROVED",
        {
          headers:
            headers(
              accessToken
            ),
          cache:
            "no-store",
        }
      );
  } catch {
    return {
      discovered:
        0,
      available:
        false,
    };
  }

  if (!response.ok) {
    return {
      discovered:
        0,
      available:
        false,
    };
  }

  let payload:
    OrganizationAclsResponse;

  try {
    payload =
      await response.json() as OrganizationAclsResponse;
  } catch {
    return {
      discovered:
        0,
      available:
        false,
    };
  }

  const urns =
    Array.from(
      new Set(
        (payload.elements ?? [])
          .filter(
            (item) =>
              item.state ===
                "APPROVED" &&
              [
                "ADMINISTRATOR",
                "CONTENT_ADMINISTRATOR",
              ].includes(
                item.role ??
                  ""
              )
          )
          .map(
            (item) =>
              item.organization ||
              item.organizationTarget ||
              ""
          )
          .filter(
            Boolean
          )
      )
    );

  let discovered =
    0;

  for (
    const organizationUrn
    of urns
  ) {
    const organizationId =
      organizationIdFromUrn(
        organizationUrn
      );

    if (!organizationId) {
      continue;
    }

    let organization:
      OrganizationResponse = {};

    try {
      const detailResponse =
        await fetch(
          `https://api.linkedin.com/rest/organizations/${encodeURIComponent(
            organizationId
          )}`,
          {
            headers:
              headers(
                accessToken
              ),
            cache:
              "no-store",
          }
        );

      if (
        detailResponse.ok
      ) {
        organization =
          await detailResponse.json() as OrganizationResponse;
      }
    } catch {
      // El nombre es opcional.
    }

    try {
      await storeSocialConnection({
        platform:
          "linkedin",
        connectionType:
          "organization",
        externalAccountId:
          organizationId,
        accountName:
          organization.localizedName ||
          organization.vanityName ||
          `Organización ${organizationId}`,
        accessToken,
        refreshToken:
          null,
        expiresAt:
          null,
        scopes,
        metadata: {
          organization_urn:
            organizationUrn,
          linkedin_api_version:
            LINKEDIN_API_VERSION,
          discovery:
            "organizationAcls",
        },
        connectedBy,
      });

      discovered +=
        1;
    } catch (
      storageError
    ) {
      console.error(
        "No se pudo registrar organización LinkedIn:",
        storageError
      );
    }
  }

  return {
    discovered,
    available:
      true,
  };
}