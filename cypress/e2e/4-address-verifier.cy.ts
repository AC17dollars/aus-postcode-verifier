/**
 * 10. Entering 3004, Melbourne, VIC shows 2 locations with valid result (unless API error)
 */
describe("Address verifier - 3004 Melbourne VIC", () => {
  const emailPrefix = "e2e-verifier-";

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

  it("shows 2 locations for 3004, Melbourne, VIC", () => {
    const email = `${emailPrefix}${Date.now()}@example.com`;
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

      cy.get('input[id="postcode"]').clear().type("3004");
      cy.get('input[id="suburb"]').clear().type("Melbourne");
      cy.get("#state").click();
      cy.get("body").type("{downarrow}{downarrow}{downarrow}{enter}");

      cy.get('button[type="submit"]').click();

      cy.contains("Valid postcode", { timeout: 15000 }).should("exist");
      cy.contains("2 Localities Found").should("exist");
    });
  });
});
