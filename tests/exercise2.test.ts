import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
const axios = (await import('axios')).default;

// Generates a unique email address based on the base email
function generateUniqueEmail(baseEmail = "vicmoller18", domain = "gmail.com"): string {
  const suffix = Math.random().toString(36).substring(2, 7);
  return `${baseEmail}+${suffix}@${domain}`;
}

// Creates a user via the API and returns the user information
async function createUserThroughApi() {
  const url = "https://api.club-administration.qa.qubika.com/api/auth/register";
  const headers = {
    "accept": "*/*",
    "Content-Type": "application/json"
  };
  const email = generateUniqueEmail();
  const data = {
    email,
    password: "PassQBK",
    roles: ["ROLE_ADMIN"]
  };
  const response = await axios.post(url, data, { headers });
  return response.data;
}

// Saves the user information to a JSON file inside the 'userdata' folder
function saveUserToFile(userInfo: any, filePath = "userdata/user_info.json") {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let data: any[] = [];
  if (fs.existsSync(filePath)) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      data = JSON.parse(fileContent);
      if (!Array.isArray(data)) data = [data];
    } catch {
      data = [];
    }
  }

  data.push(userInfo);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}

// Creates a category or subcategory
async function createCategory(page: Page, categoryName: string, isSubcategory = false, parentCategoryName?: string) {
  // Open the "Add Category" dialog
  const addButton = page.locator('button.btn.btn-primary');
  await addButton.waitFor({ state: 'visible' });
  await addButton.click();

  // Fill the category name
  const categoryNameField = page.locator('[formcontrolname="name"]');
  await categoryNameField.waitFor({ state: 'visible' });
  await categoryNameField.fill(categoryName);

  // Handle subcategory creation
  if (isSubcategory) {
    const subcategorySpan = page.locator("span.text-muted", { hasText: "Es subcategoria?" });
    await subcategorySpan.click();

    // Select the parent category for the subcategory
    const categoryField = page.locator('input[aria-autocomplete="list"]');
    await categoryField.waitFor({ state: 'visible' });
    await categoryField.fill(parentCategoryName!);

    // Wait for the option and click on it
    const optionLocator = page.locator(`span.ng-option-label.ng-star-inserted:has-text('${parentCategoryName}')`);
    await optionLocator.waitFor({ state: 'visible' });
    await optionLocator.click();
  }

  // Submit the form to create the category
  const acceptButton = page.locator('button.btn.btn-primary.my-3');
  await page.waitForSelector('button.btn.btn-primary.my-3:not([disabled])');
  await acceptButton.click();
}

// Validates through UI that a category or subcategory was created
async function validateCategoryUI(page: Page, categoryName: string) {
  const pageNumbers = page.locator("a.page-link");
  const lastPageButton = pageNumbers.nth(-2);
  await lastPageButton.scrollIntoViewIfNeeded();
  await lastPageButton.click();

  await page.waitForTimeout(3000);

  const savedCategory = page.locator(`text=${categoryName}`);
  expect(await savedCategory.isVisible()).toBeTruthy();
}

// Authenticates with the API and returns the authentication token
async function authenticateApi(email: string, password: string, username: string): Promise<string> {
  const loginUrl = "https://api.club-administration.qa.qubika.com/api/auth/login";
  const headers = {
    "accept": "*/*",
    "Content-Type": "application/json"
  };
  const payload = {
    email,
    password,
    userName: username
  };
  const response = await axios.post(loginUrl, payload, { headers });

  if (response.status === 200) {
    const token = response.data.token;
    if (!token) {
      throw new Error("Authentication successful, but no token found in the response.");
    }
    return token;
  } else {
    throw new Error(`Authentication failed: ${response.status} - ${response.statusText}`);
  }
}

// Retrieves all categories using the API
async function getCategoriesApi(token: string) {
  const url = "https://api.club-administration.qa.qubika.com/api/category-type";
  const headers = {
    "accept": "*/*",
    "Authorization": `Bearer ${token}`
  };
  const response = await axios.get(url, { headers });

  if (response.status === 200) {
    return response.data;
  } else {
    throw new Error(`Failed to retrieve categories: ${response.status} - ${response.statusText}`);
  }
}

// Validates if the last created category has the given name
function lastCreatedCategoryApi(categories: any[]): string {
  if (!categories.length) {
    throw new Error("No categories found.");
  }

  const lastCategory = categories[categories.length - 1];
  return lastCategory.name;
}

test('workflow', async ({ page }) => {
  // Step 1: Create a new user through the API and save their information
  const userInfo = await createUserThroughApi();
  saveUserToFile(userInfo);
  const email = userInfo.email;
  const password = "PassQBK";
  const username = userInfo.userName;

  // Step 2: Go to Qubika Sports Club Management System
  await page.goto("https://club-administration.qa.qubika.com/#/auth/login");

  // Step 3: Validate that the login page is displayed correctly
  expect(page.url()).toBe("https://club-administration.qa.qubika.com/#/auth/login");

  const qubikaHeader = page.locator('h3');
  await expect(qubikaHeader).toBeVisible();

  const emailField = page.locator('input[formcontrolname="email"]');
  await expect(emailField).toBeVisible();

  const passwordField = page.locator('input[formcontrolname="password"]');
  await expect(passwordField).toBeVisible();

  const loginButton = page.locator('button[type="submit"]');
  await expect(loginButton).toBeVisible();

  // Step 4: Log in with the created user
  await emailField.fill(email);
  await passwordField.fill(password);
  await loginButton.click();

  // Step 5: Validate that the user is logged in
  const categoryType = page.locator('a.nav-link[href="#/category-type"]');
  await categoryType.waitFor({ state: 'visible' });
  expect(await categoryType.isVisible()).toBeTruthy();

  const currentUrl = page.url();
  const dashboardUrl = "https://club-administration.qa.qubika.com/#/dashboard";
  expect(currentUrl).toBe(dashboardUrl);

  // Step 6a: Go to the Category page
  await categoryType.click();

  // Step 6b: Create a new category and validate that the category was created successfully
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const randomCategoryName = `Category ${randomSuffix}`;

  await createCategory(page, randomCategoryName);

  // Validating through UI
  await validateCategoryUI(page, randomCategoryName);

  // Validating through API
  const token = await authenticateApi(email, password, username);
  const categories = await getCategoriesApi(token);
  const newCategory = lastCreatedCategoryApi(categories);
  expect(newCategory).toBe(randomCategoryName);

  // Step 6c: Create a subcategory and validate it is displayed in the Categories list
  const randomSubcategoryName = `Subcategory ${randomSuffix}`;

  await createCategory(page, randomSubcategoryName, true, randomCategoryName);

  // Validate through UI
  await validateCategoryUI(page, randomSubcategoryName);

  // Validate through API
  const updatedCategories = await getCategoriesApi(token);
  const newSubcategory = lastCreatedCategoryApi(updatedCategories);
  expect(newSubcategory).toBe(randomSubcategoryName);
});