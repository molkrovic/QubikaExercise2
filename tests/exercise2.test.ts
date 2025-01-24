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
  //console.log("The user was created")
  saveUserToFile(userInfo);
  //console.log("The user info was saved")
  const email = userInfo.email;
  const password = "PassQBK";
  const username = userInfo.userName;
  //console.log("Step 1 completed")

  // Step 2: Go to Qubika Sports Club Management System
  await page.goto("https://club-administration.qa.qubika.com/#/auth/login");
  //console.log("Step 2 completed")

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

  //console.log("Step 3 completed")

  // Step 4: Log in with the created user
  await emailField.fill(email);
  await passwordField.fill(password);
  await loginButton.click();

  //console.log("Step 4 completed")

  // Step 5: Validate that the user is logged in
  const categoryType = page.locator('a.nav-link[href="#/category-type"]');
  await categoryType.waitFor({ state: 'visible' });
  expect(await categoryType.isVisible()).toBeTruthy();

  const currentUrl = page.url();
  const dashboardUrl = "https://club-administration.qa.qubika.com/#/dashboard";
  expect(currentUrl).toBe(dashboardUrl);

  //console.log("Step 5 completed")

  // Step 6a: Go to the Category page
  await categoryType.click();

  //console.log("Step 6a completed")

  // Step 6b: Create a new category and validate that the category was created successfully
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const randomCategoryName = `Category ${randomSuffix}`;
  //console.log(`Random category created for step 6b: ${randomCategoryName}`)

  await createCategory(page, randomCategoryName);
  //console.log(`Category ${randomCategoryName} created`)


  // Validating through UI
  await validateCategoryUI(page, randomCategoryName);
  //console.log(`Category ${randomCategoryName} validated (UI)`)

  // Validating through API
  const token = await authenticateApi(email, password, username);
  //console.log("Token obtained")
  const categories = await getCategoriesApi(token);
  //console.log("Categories obtained (API)")
  const newCategory = lastCreatedCategoryApi(categories);
  //console.log(`Last category identified is ${newCategory}`)
  expect(newCategory).toBe(randomCategoryName);
  //console.log(`Category ${randomCategoryName} validated (API)`)

  // Step 6c: Create a subcategory and validate it is displayed in the Categories list
  const randomSubcategoryName = `Subcategory ${randomSuffix}`;
  //console.log(`Random subcategory created for step 6c: ${randomSubcategoryName}`)

  await createCategory(page, randomSubcategoryName, true, randomCategoryName);
  //console.log(`Subcategory ${randomSubcategoryName} created`)

  // Validate through UI
  await validateCategoryUI(page, randomSubcategoryName);
  //console.log(`Subcategory ${randomSubcategoryName} validated (UI)`)

  // Validate through API
  const updatedCategories = await getCategoriesApi(token);
  //console.log("Categories obtained (second time) (API)")
  const newSubcategory = lastCreatedCategoryApi(updatedCategories);
  //console.log(`Last (sub)category identified is ${newSubcategory}`)
  expect(newSubcategory).toBe(randomSubcategoryName);
  //console.log(`Subcategory ${randomSubcategoryName} validated (API)`)
});