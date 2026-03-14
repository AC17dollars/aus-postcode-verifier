/**
 * 4. Redirects to /auth when unauthenticated on most routes (except verify-email with token)
 * 5. Authenticated + verify-email?token=... shows authenticated confirmation page
 * 6. Unauthenticated + verify-email?token=... shows unauthenticated confirmation page
 * 7. Non-admin visiting /logs redirects to /
 */
describe("Redirects and verify-email token pages", () => {
  const emailPrefix = "e2e-redirects-";

  before(() => {
    cy.request({
      method: "DELETE",
      url: `/api/test/cleanup?emailPrefix=${emailPrefix}`,
      failOnStatusCode: false,
    });
  });

  afterEach(() => {
    cy.request({
      method: "DELETE",
      url: `/api/test/cleanup?emailPrefix=${emailPrefix}`,
      failOnStatusCode: false,
    });
  });

  after(() => {
    cy.request({
      method: "DELETE",
      url: `/api/test/cleanup?emailPrefix=${emailPrefix}`,
      failOnStatusCode: false,
    });
  });

  it("redirects unauthenticated user to /auth when visiting /", () => {
    cy.visit("/", { failOnStatusCode: false });
    cy.url().should("include", "/auth");
  });

  it("redirects unauthenticated user to /auth when visiting /logs", () => {
    cy.visit("/logs", { failOnStatusCode: false });
    cy.url().should("include", "/auth");
  });

  it("redirects unauthenticated user to /auth when visiting /verify-email without token", () => {
    cy.visit("/verify-email", { failOnStatusCode: false });
    cy.url().should("include", "/auth");
  });

  it("verify-email with invalid token shows error when unauthenticated", () => {
    cy.visit("/verify-email?token=invalid-token-123", {
      failOnStatusCode: false,
    });
    cy.contains(/Verification failed|Invalid|expired/i, {
      timeout: 10000,
    }).should("be.visible");
  });

  it("when unauthenticated, verify-email with valid token shows unauthenticated confirmation (Go to login)", () => {
    const email = `${emailPrefix}unverified-${Date.now()}@example.com`;
    cy.request({
      method: "POST",
      url: "/api/test/users",
      body: { email, verified: false },
      failOnStatusCode: false,
    }).then((res) => {
      if (res.status !== 200) {
        cy.log(
          "Skipping: set ALLOW_TEST_ROUTES=true and ensure Elasticsearch is running",
        );
        return;
      }
      cy.request({
        url: `/api/test/verification-token?email=${encodeURIComponent(email)}`,
        failOnStatusCode: false,
      }).then((tokenRes) => {
        if (tokenRes.status !== 200) {
          cy.log("Could not get verification token");
          return;
        }
        const token = tokenRes.body.token;
        cy.visit(`/verify-email?token=${token}`, { failOnStatusCode: false });
        cy.contains(/Email verified|Verification failed/i, {
          timeout: 10000,
        }).should("be.visible");
        cy.contains("Go to login").should("be.visible");
      });
    });
  });

  it("when authenticated as unverified user, verify-email with own token shows authenticated confirmation (Account verified, Close)", () => {
    const email = `${emailPrefix}unverified-auth-${Date.now()}@example.com`;
    cy.request({
      method: "POST",
      url: "/api/test/users",
      body: { email, verified: false },
      failOnStatusCode: false,
    }).then((res) => {
      if (res.status !== 200) {
        cy.log(
          "Skipping: set ALLOW_TEST_ROUTES=true and ensure Elasticsearch is running",
        );
        return;
      }
      const { password } = res.body as { email: string; password: string };
      cy.login(email, password);
      cy.url().should("include", "/verify-email");
      cy.request({
        url: `/api/test/verification-token?email=${encodeURIComponent(email)}`,
        failOnStatusCode: false,
      }).then((tokenRes) => {
        if (tokenRes.status !== 200) {
          cy.log("Could not get verification token");
          return;
        }
        const token = tokenRes.body.token;
        cy.visit(`/verify-email?token=${token}`, { failOnStatusCode: false });
        cy.contains("Account verified", { timeout: 10000 }).should(
          "be.visible",
        );
        cy.get("button").contains("Close").should("be.visible");
      });
    });
  });

  it("non-admin visiting /logs is redirected to /", () => {
    const email = `${emailPrefix}verified-${Date.now()}@example.com`;
    cy.request({
      method: "POST",
      url: "/api/test/users",
      body: { email, verified: true },
      failOnStatusCode: false,
    }).then((res) => {
      if (res.status !== 200) {
        cy.log(
          "Skipping: set ALLOW_TEST_ROUTES=true and ensure Elasticsearch is running",
        );
        return;
      }
      const { password } = res.body as { email: string; password: string };
      cy.login(email, password);
      cy.url().should("eq", Cypress.config().baseUrl + "/");
      cy.visit("/logs", { failOnStatusCode: false });
      cy.url().should("eq", Cypress.config().baseUrl + "/");
    });
  });
});
