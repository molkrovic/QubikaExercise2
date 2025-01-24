# Qubika Sports Club Management - E2E Test Automation

## Overview
This project automates the workflow for user registration, login, category creation, and subcategory creation in the Qubika Sports Club Management System using Playwright and TypeScript. The test covers both API and UI automation in a single end-to-end (E2E) test.

## Test Workflow

1. **Create a new user through the API**:
   - The user is created via the API with a random email, username, and given password.
   - The user information is saved in a JSON file.
   
2. **Go to Qubika Sports Club Management System**:
   - The test navigates to the login page of the Qubika Sports Club Management System.

3. **Validate the login page**:
   - The test ensures the login page is displayed correctly, verifying the presence of key elements such as the email and password fields, and the login button.

4. **Log in with the created user**:
   - The user logs in using the credentials generated during the API step.

5. **Validate that the user is logged in**:
   - After logging in, the test confirms the user is successfully redirected to the dashboard.

6. **Create a new category**:
   - The user navigates to the category page, creates a new category, and validates its successful creation through both the UI and the API.

7. **Create a subcategory**:
   - The user creates a subcategory under the newly created category and validates it through both the UI and the API.

## Requirements

- Node.js
- Playwright
- TypeScript
- Axios

## Setup Instructions

1. Install Node.js and npm.
2. Install project dependencies:
```bash
   npm install playwright @playwright/test typescript ts-node axios
```
3. Install Playwright browsers:
```bash
   npx playwright install
```
4. Install additional dependencies for Playwright:
```bash
   npx playwright install-deps
```
5. Install the Chrome browser for testing:
```bash
   npx playwright install chrome
```
   
## Running the Test

To run the test, use the following command:
```bash
    npx playwright test
```

## Observations

- The email is generated dynamically to ensure uniqueness.
- The test is designed to run on multiple browsers (Chromium, Firefox, and WebKit) to ensure compatibility across different platforms.

## Notes

- This test is implemented as a single E2E test function, as required by the exercise.
- The user data is saved in a JSON file to fulfill the requirement of "saving the user information," even though the data is not actively used throughout the test. The email is used directly within the test to log in the user.

## Enhancements
- Future improvements could include adding more test scenarios, such as updating or deleting categories and subcategories, or handling error cases more robustly.
- It would also be beneficial to introduce test data cleanup to ensure that the created categories and users do not persist between test runs.