// Cypress E2E support

Cypress.Commands.add("login", (email: string, password: string) => {
  cy.visit("/auth");
  cy.get('input[name="email"]').clear().type(email);
  cy.get('input[name="password"]').clear().type(password);
  cy.get('button[type="submit"]').click();
});
