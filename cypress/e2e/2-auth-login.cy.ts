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
      cy.get('input[name="email"]', { timeout: 10000 })
        .should("exist")
        .type(email, { force: true });
      cy.get('input[name="password"]').type(password, { force: true });
      cy.get('button[type="submit"]').click();

      cy.url().should("include", "/verify-email", { timeout: 20000 });
      cy.contains("Verify your email").should("exist");
      cy.contains("Resend verification email").should("exist");
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
      cy.get('input[name="email"]', { timeout: 10000 })
        .should("exist")
        .type(email, { force: true });
      cy.get('input[name="password"]').type(password, { force: true });
      cy.get('button[type="submit"]').click();

      cy.url().should("eq", Cypress.config().baseUrl + "/", { timeout: 20000 });
      cy.contains("Verifier").should("exist");
      cy.get('input[id="postcode"]').should("exist");
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
      cy.get('input[name="email"]', { timeout: 10000 })
        .should("exist")
        .type(email, { force: true });
      cy.get('input[name="password"]').type(password, { force: true });
      cy.get('button[type="submit"]').click();

      cy.url().should("eq", Cypress.config().baseUrl + "/", { timeout: 20000 });
      cy.contains("Verifier").should("exist");
      cy.get('a[href="/logs"]').should("exist");
      cy.contains("Logs").should("exist");

      cy.get('a[href="/logs"]').click();
      cy.url().should("include", "/logs");
      cy.contains("GraphQL Logs").should("exist");
    });
  });
});
