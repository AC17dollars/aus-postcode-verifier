/**
 * 2. Login unverified -> verify-email page; after verification -> verifier form
 * 3. Login verified -> verifier form
 * 4. Login admin -> logs link in sidebar, can visit logs page
 */
describe("Login flows", () => {
  const emailPrefix = "e2e-login-";

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

  it("login as unverified user shows verify-email (resend) page", () => {
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
      const { password } = res.body as { email: string; password: string };
      cy.visit("/auth");
      cy.get('input[name="email"]').type(email);
      cy.get('input[name="password"]').type(password);
      cy.get('button[type="submit"]').click();

      cy.url().should("include", "/verify-email");
      cy.contains("Verify your email").should("be.visible");
      cy.contains("Resend verification email").should("be.visible");
    });
  });

  it("login as verified user shows verifier form", () => {
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
      cy.visit("/auth");
      cy.get('input[name="email"]').type(email);
      cy.get('input[name="password"]').type(password);
      cy.get('button[type="submit"]').click();

      cy.url().should("eq", Cypress.config().baseUrl + "/");
      cy.contains("Verifier").should("be.visible");
      cy.get('input[id="postcode"]').should("be.visible");
    });
  });

  it("login as admin shows logs link in sidebar and can visit logs page", () => {
    const email = `${emailPrefix}admin-${Date.now()}@example.com`;
    cy.request({
      method: "POST",
      url: "/api/test/users",
      body: { email, verified: true, admin: true },
      failOnStatusCode: false,
    }).then((res) => {
      if (res.status !== 200) {
        cy.log(
          "Skipping: set ALLOW_TEST_ROUTES=true and ensure Elasticsearch is running",
        );
        return;
      }
      const { password } = res.body as { email: string; password: string };
      cy.visit("/auth");
      cy.get('input[name="email"]').type(email);
      cy.get('input[name="password"]').type(password);
      cy.get('button[type="submit"]').click();

      cy.url().should("eq", Cypress.config().baseUrl + "/");
      cy.contains("Verifier").should("be.visible");
      cy.get('a[href="/logs"]').should("be.visible");
      cy.contains("Logs").should("be.visible");

      cy.get('a[href="/logs"]').click();
      cy.url().should("include", "/logs");
      cy.contains("GraphQL Logs").should("be.visible");
    });
  });
});
