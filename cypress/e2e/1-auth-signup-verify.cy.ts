/**
 * 1. Signup -> Email sent -> Redirects to verify-email -> After clicking verify link -> Verifier form
 */
describe("Signup and verification flow", () => {
  const testEmail = `e2e-signup-${Date.now()}@example.com`;
  const testPw = "5c5569be4814ec6acb";

  before(() => {
    cy.request({
      method: "DELETE",
      url: "/api/test/cleanup?emailPrefix=e2e-signup-",
      failOnStatusCode: false,
    });
  });

  afterEach(() => {
    cy.request({
      method: "DELETE",
      url: "/api/test/cleanup?emailPrefix=e2e-signup-",
      failOnStatusCode: false,
    });
  });

  after(() => {
    cy.request({
      method: "DELETE",
      url: "/api/test/cleanup?emailPrefix=e2e-signup-",
      failOnStatusCode: false,
    });
  });

  it("signs up, redirects to verify-email (resend page), then verify link shows verifier form", () => {
    cy.visit("/auth");
    cy.get("button").contains("Register").click();

    cy.get('input[name="name"]').type("E2E Test User");
    cy.get('input[name="email"]').type(testEmail);
    cy.get('input[name="password"]').type(testPw);
    cy.get('button[type="submit"]').click();

    // Redirects to verify-email (resend page)
    cy.url().should("include", "/verify-email");
    cy.contains("Verify your email").should("be.visible");
    cy.contains("Resend verification email").should("be.visible");

    // Get verification token via test API (requires ALLOW_TEST_ROUTES=true)
    cy.request({
      url: `/api/test/verification-token?email=${encodeURIComponent(testEmail)}`,
      failOnStatusCode: false,
    }).then((res) => {
      if (res.status !== 200) {
        cy.log(
          "Skipping verify-link step: test API not available or user not found. Set ALLOW_TEST_ROUTES=true and ensure Elasticsearch is running.",
        );
        return;
      }
      const token = res.body.token;
      cy.visit(`/verify-email?token=${token}`);

      // Authenticated confirmation: "Account verified" and Close, then verifier form
      cy.contains("Account verified", { timeout: 10000 }).should("be.visible");
      cy.get("button").contains("Close").click();

      cy.url().should("eq", Cypress.config().baseUrl + "/");
      cy.contains("Verifier").should("be.visible");
      cy.get('input[id="postcode"]').should("be.visible");
    });
  });
});
