/**
 * 8. Entering 3004, Melbourne, VIC shows 2 locations with valid result (unless API error)
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

  beforeEach(() => {
    // Mock GraphQL searchPostcode to return 2 localities for 3004 Melbourne VIC
    cy.intercept("POST", "**/api/graphql", (req) => {
      const body = req.body as { query?: string; variables?: { q?: string } };
      const isSearch =
        body?.query?.includes("searchPostcode") &&
        body?.variables?.q === "3004";
      if (isSearch) {
        req.reply({
          statusCode: 200,
          body: {
            data: {
              searchPostcode: [
                {
                  id: 1,
                  location: "MELBOURNE",
                  postcode: "3004",
                  state: "VIC",
                  latitude: -37.8409,
                  longitude: 144.9465,
                  category: "Delivery",
                },
                {
                  id: 2,
                  location: "MELBOURNE",
                  postcode: "3004",
                  state: "VIC",
                  latitude: -37.8409,
                  longitude: 144.9464,
                  category: "Post Office",
                },
              ],
            },
          },
        });
        return;
      }
      req.continue();
    }).as("graphql");
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
      cy.get('input[name="email"]').type(email);
      cy.get('input[name="password"]').type(password);
      cy.get('button[type="submit"]').click();

      cy.url().should("eq", Cypress.config().baseUrl + "/");
      cy.contains("Verifier").should("be.visible");

      cy.get('input[id="postcode"]').clear().type("3004");
      cy.get('input[id="suburb"]').clear().type("Melbourne");
      cy.get("#state").click();
      cy.get("[role='option']").contains("VIC").click();

      cy.get('button[type="submit"]').click();
      cy.wait("@graphql");

      cy.contains("Valid Location", { timeout: 10000 }).should("be.visible");
      cy.contains("2 Localities Found").should("be.visible");
    });
  });
});
