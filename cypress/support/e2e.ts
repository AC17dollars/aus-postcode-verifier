// Cypress E2E support

Cypress.Commands.add("login", (email: string, password: string) => {
  cy.visit("/auth");
  cy.get('input[name="email"]')
    .should("exist")
    .clear()
    .type(email, { force: true });
  cy.get('input[name="password"]').clear().type(password, { force: true });
  cy.get('button[type="submit"]').click();
  // Wait for navigation so headless runs don't race on the next assertion
  cy.url().should("not.include", "/auth", { timeout: 20000 });
});
