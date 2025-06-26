document.addEventListener('DOMContentLoaded', function () {
  // Initialize the dashboard
  initializeDashboard();
  loadUserPreferences();

  // Set current time for intake time input
  document.getElementById('set-current-time').addEventListener('click', setCurrentTime);

  // Add food items
  document.getElementById('add-food-items').addEventListener('click', addfood_items);

  // Add drink
  document.getElementById('add-drink').addEventListener('click', addDrink);

  // Tab button event listeners
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', function () {
      showSection(this.getAttribute('onclick').match(/showSection\('(.+)'\)/)[1]);
    });
  });

  // Analytics interval selectors
  document.querySelectorAll('.interval-btn').forEach(button => {
    button.addEventListener('click', function () {
      setAnalyticsInterval(this.dataset.interval);
    });
  });

  // Initialize with 7-day interval
  setAnalyticsInterval('7');

  // Show the default section (health)
  showSection('health');
});
// ============================================
// Preferences
// ============================================
/**
 * Load user preferences from localStorage
 */
document.addEventListener('DOMContentLoaded', function () {
  // Existing code...

  // Add this line to load preferences when dashboard is initialized
  loadUserPreferences();
});

/**
 * Load user preferences from the server
 */
function loadUserPreferences() {
  console.log('Loading user preferences...');

  // Try multiple possible endpoints
  const endpoints = ['/preference'];

  // Try each endpoint until one works
  tryEndpoints(endpoints, 0);

  function tryEndpoints(urls, index) {
    if (index >= urls.length) {
      showNotification('Failed to load preferences. Please try again later.', 'error');
      return;
    }

    console.log(`Trying endpoint: ${urls[index]}...`);

    fetch(urls[index])
      .then(response => {
        console.log(`Response from ${urls[index]}:`, response.status);
        if (!response.ok) {
          throw new Error(`Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Preferences loaded successfully:', data);
        displayUserPreferences(data);
      })
      .catch(error => {
        console.warn(`Failed to load from ${urls[index]}:`, error);
        // Try next endpoint
        tryEndpoints(endpoints, index + 1);
      });
  }
}

/**
 * Save User Preferences
 * @param {Object} preferences - User preferences to save
 */
function saveUserPreferences(preferences) {
  fetch('/preference', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + localStorage.getItem('authToken')
    },
    body: JSON.stringify(preferences)
  })
    .then(response => {
      console.log('Preference save response:', response.status);

      // Handle both JSON responses and redirects as success
      if (response.ok) {
        if (response.redirected) {
          // Handle redirect - the server is trying to redirect us after saving
          showNotification('Preferences saved successfully!', 'success');
          loadUserPreferences();
          return { success: true };
        } else {
          // Try to parse JSON if it's not a redirect
          return response.json().catch(() => {
            // If not JSON, still treat as success since response was OK
            return { success: true };
          });
        }
      } else {
        throw new Error(`Status: ${response.status}`);
      }
    })
    .then(data => {
      showNotification('Preferences saved successfully!', 'success');
      loadUserPreferences(); // Reload and display updated preferences
    })
    .catch(error => {
      console.error('Preference save error:', error);
      showNotification('Failed to save preferences: ' + error.message, 'error');
    });
}

/**
 * Display user preferences in the UI
 */
function displayUserPreferences(preferences) {
  console.log("Raw preferences data:", preferences);

  // Try to extract preferences from various possible structures
  let prefData = preferences;

  if (preferences.preference) {
    prefData = preferences.preference;
    console.log("Using nested preference data");
  } else if (preferences.data && preferences.data.preference) {
    prefData = preferences.data.preference;
    console.log("Using deeply nested preference data");
  } else if (preferences.user && preferences.user.preferences) {
    prefData = preferences.user.preferences;
    console.log("Using user.preferences data");
  }

  console.log("Extracted preference data:", prefData);

  // Update UI elements if they exist
  updatePreferenceIfExists('dietary_restriction-type-display',
    prefData.dietary_restrictions || "We are good"
    
  );
  
  updatePreferenceIfExists('meal-times-display',
    formatMealTimes(
      prefData
    )
  );
  updatePreferenceIfExists('allergies-display',
    formatAllergies([
      prefData.allergies,
      prefData.food_allergies,
      prefData.allergy_info,
      prefData.preffered_allergy
    ])
  );


  updatePreferenceIfExists('favorite-foods-display',
    prefData.preferred_meal_type || "Not specified"
  );

  updatePreferenceIfExists('drink-preferences-display',
    prefData.preferred_drink_type || 'Not specified'
  );

  updatePreferenceIfExists('meals-per-day-display',
    prefData.meals_per_day || 'Not specified'
  );

  updatePreferenceIfExists('health-condition-display',
    prefData.disease || 'Not specified'
  )
}

/**
 * Helper function to update preference display if element exists
 */
function updatePreferenceIfExists(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value;
    element.classList.remove('not-specified');
  } else {
    console.warn(`Element #${elementId} not found in DOM`);
  }
}

/**
 * Get first defined value from array
 */
function getFirstDefined(options, diet_type) {
  // values here are the possible values to check
  const values = Array.isArray(options) ? options : [options];
  // loop through the values and return the first defined one
  for (const val of values) {
    if (val !== undefined && val !== null && val !== '' && val == diet_type) {
      return val;
    }
  }
  return 'Not specified';
}

/**
 * Format allergies from possible sources
 */
function formatAllergies(possibleValues) {
  for (const val of possibleValues) {
    if (Array.isArray(val) && val.length) {
      return val.join(', ');
    } else if (typeof val === 'string' && val) {
      return val;
    }
  }
  return 'None';
}

/**
 * Format meal times from various data structures
 */
function formatMealTimes(prefData) {
  console.log('Formatting meal times from:', prefData);
  if (prefData.preferred_meal_time) {
    if (typeof prefData.preferred_meal_time === 'object' && !Array.isArray(prefData.preferred_meal_time)) {
      return Object.entries(prefData.preferred_meal_time)
        .map(([meal, time]) => `${meal}: ${time}`)
        .join(', ');
    } else if (Array.isArray(prefData.preferred_meal_time)) {
      return prefData.preferred_meal_time.join(', ');
    } else if (typeof prefData.preferred_meal_time === 'string') {
      return prefData.preferred_meal_time;
    }
  }

  return prefData.preferred_meal_time || 'Not specified';
}
// ============================================
// SECTION 1: NAVIGATION & UI FUNCTIONS
// ============================================

/**
 * Switch between dashboard sections
 * @param {string} sectionId - ID of the section to display
 */
function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
  });

  // Deactivate all tab buttons
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.remove('active');
  });

  // Show the selected section
  document.getElementById(sectionId).classList.add('active');

  // Activate the corresponding tab button
  document.querySelector(`.tab-button[onclick="showSection('${sectionId}')"]`).classList.add('active');

  // Special handling for analytics section
  if (sectionId === 'analytics') {
    loadAnalyticsData();
  }
}

/**
 * Set the current time in the intake time input
 */
function setCurrentTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  document.getElementById('intake-time').value = `${hours}:${minutes}`;
}

/**
 * Show a notification message
 * @param {string} message - Message to display
 * @param {string} type - Notification type (success, info, warning, error)
 */
function showNotification(message, type = 'info') {
  // Create notification container if it doesn't exist
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    document.body.appendChild(container);
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
        <span>${message}</span>
        <button type="button" class="close-btn">&times;</button>
    `;

  // Add to container
  container.appendChild(notification);

  // Close button
  notification.querySelector('.close-btn').addEventListener('click', function () {
    notification.remove();
  });

  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

/**
 * Initialize the dashboard with user data
 */
function initializeDashboard() {
  // Fetch user information
  fetchCurrentUser()
    .then(userData => {
      if (userData) {
        // Store user ID for later use
        localStorage.setItem('userId', userData.id);

        // Load user's food and drink data
        loadfoodItems();
        loadDrinkItems();
        loadWaterProgress();
      }
    })
    .catch(error => {
      console.error('Error fetching user data:', error);
      showNotification('Failed to load user data. Please refresh the page.', 'error');
    });
}

// ============================================
// SECTION 2: FOOD TRACKING FUNCTIONS
// ============================================

/**
 * Add food items to the tracking list
 */
/**
 * Initialize food tracking functionality
 */
function initFoodTracking() {
  // Add event listeners to meal type buttons
  document.querySelectorAll('.btn-track[data-track="meal_type"]').forEach(button => {
    button.addEventListener('click', function () {
      // Remove active class from all meal type buttons
      document.querySelectorAll('.btn-track[data-track="meal_type"]').forEach(btn => {
        btn.classList.remove('active');
      });

      // Add active class to clicked button
      this.classList.add('active');
    });
  });

  // Add event listener to the Add button
  document.getElementById('add-food-items').addEventListener('click', addFoodItems);

  // Add event listener to input field for Enter key
  document.getElementById('food-items-input').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addFoodItems();
    }
  });
}

/**
 * Add food items to the tracking list
 */
async function addFoodItems() {
  // Get food items input
  const food_items = document.getElementById('food-items-input').value.trim();

  if (!food_items) {
    showNotification('Please enter food items', 'warning');
    return;
  }

  // Get the selected meal type from active button
  const mealTypeBtn = document.querySelector('.btn-track[data-track="meal_type"].active');
  if (!mealTypeBtn) {
    showNotification('Please select a meal type', 'warning');
    return;
  }

  const meal_type = mealTypeBtn.dataset.value;
  const intake_time = document.getElementById('intake-time').value ||
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Create a unique ID for this food entry
  const food_id = Date.now();

  // Add to UI immediately for better responsiveness
  addFoodToList({
    id: food_id,
    items: food_items.split(',').map(item => item.trim()),
    mealType: meal_type,
    time: intake_time
  });

  try {
    // Send food data to backend, which will use analyze_nutritional_data from utils.py
    const response = await fetch('/food/food-intake', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('authToken')
      },
      body: JSON.stringify({
        meal_type: meal_type,
        food_items: food_items.split(',').map(item => item.trim()),
        intake_time: intake_time
      })
    });

    // Log full response for debugging
    console.log(`Food tracking full response:`, {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      headers: Object.fromEntries([...response.headers])
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Full server response:', data);

    // Extract nutrition data from server response (should be calculated by analyze_nutritional_data in backend)
    let serverNutrition = {
      calories: 0,
      proteins: 0,
      carbs: 0,
      fats: 0,
      sugar: 0
    };

    if (data.nutrition) {
      if (Array.isArray(data.nutrition)) {
        data.nutrition.forEach(item => {
          serverNutrition.calories += item.calories_estimate || 0;
          serverNutrition.proteins += item.protein_g || 0;
          serverNutrition.carbs += item.carbohydrates_g || 0;
          serverNutrition.fats += item.fat_g || 0;
          serverNutrition.sugar += item.sugar_g || 0;
        });
      } else if (typeof data.nutrition === 'object') {
        serverNutrition = {
          calories: data.nutrition.calories_estimate || 0,
          proteins: data.nutrition.protein_g || 0,
          carbs: data.nutrition.carbohydrates_g || 0,
          fats: data.nutrition.fat_g || 0,
          sugar: data.nutrition.sugar_g || 0
        };
      }
    } else {
      // Fallback to top-level keys if nutrition not present
      serverNutrition = {
        calories: data.calories_estimate || 0,
        proteins: data.protein_g || 0,
        carbs: data.carbohydrates_g || 0,
        fats: data.fat_g || 0,
        sugar: data.sugar_g || 0
      };
    }

    console.log('Analyzed server nutrition:', serverNutrition);

    // Update stored data with server values
    updateStoredFoodWithServerData(food_id, {
      serverId: data.food_id,
      ...serverNutrition
    });

    showNotification('Food added successfully', 'success');
    document.getElementById('food-items-input').value = '';
  } catch (error) {
    console.error('Error saving food:', error);
    showNotification(`Food tracked locally. Server error: ${error.message}`, 'warning');
  }
}

/**
 * Add a food entry to the displayed list
 * @param {Object} food - Food entry object
 */
function addFoodToList(food) {
  const listContainer = document.getElementById('food-items-list');
  const noItemsMessage = listContainer.querySelector('.no-items-message');

  if (noItemsMessage) {
    noItemsMessage.remove();
  }

  // Create food entry element
  const foodEntry = document.createElement('div');
  foodEntry.className = 'tracked-item';
  foodEntry.dataset.id = food.id;

  // Get appropriate icon based on meal type
  let icon = 'utensils';
  switch (food.mealType) {
    case 'breakfast': icon = 'egg'; break;
    case 'lunch': icon = 'hamburger'; break;
    case 'dinner': icon = 'pizza-slice'; break;
    case 'snack': icon = 'cookie-bite'; break;
  }

  // Format food items for display
  const itemsText = Array.isArray(food.items)
    ? food.items.join(', ')
    : food.items;

  foodEntry.innerHTML = `
    <div>
      <i class="fas fa-${icon} item-icon"></i>
      <strong>${food.mealType.charAt(0).toUpperCase() + food.mealType.slice(1)}:</strong>
      ${itemsText}
    </div>
    <div class="item-time">${food.time}</div>
  `;

  listContainer.appendChild(foodEntry);

  // Store in localStorage for analytics
  const storedFoods = JSON.parse(localStorage.getItem('foodData') || '[]');
  storedFoods.push({
    id: food.id,
    items: food.items,
    mealType: food.mealType,
    time: food.time,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem('foodData', JSON.stringify(storedFoods));
}

/**
 * Update stored food with server data and nutrition information
 * @param {number} localId - Local ID of the food entry
 * @param {Object} serverData - Data from server response
 */
function updateStoredFoodWithServerData(localId, serverData) {
  const storedFoods = JSON.parse(localStorage.getItem('foodData') || '[]');
  const foodIndex = storedFoods.findIndex(item => item.id === localId);

  if (foodIndex !== -1) {
    storedFoods[foodIndex] = {
      ...storedFoods[foodIndex],
      ...serverData
    };

    localStorage.setItem('foodData', JSON.stringify(storedFoods));
    console.log('Updated food data with server information:', storedFoods[foodIndex]);
    return true;
  }

  return false;
}

// Initialize food tracking when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  initFoodTracking();
});

// ============================================
// SECTION 3: DRINK TRACKING FUNCTIONS
// ============================================
/**
 * Initialize drink tracking functionality
 */
function initDrinkTracking() {
  // Add event listeners to drink type buttons
  document.querySelectorAll('.btn-track[data-track="drink_type"]').forEach(button => {
    button.addEventListener('click', function () {
      // Remove active class from all drink type buttons
      document.querySelectorAll('.btn-track[data-track="drink_type"]').forEach(btn => {
        btn.classList.remove('active');
      });

      // Add active class to clicked button
      this.classList.add('active');
    });
  });

  // Add event listener for adding drinks
  document.getElementById('add-drink').addEventListener('click', addDrink);

  // Add event listener for setting current time
  document.getElementById('set-current-time').addEventListener('click', setCurrentTime);

  // Initialize water goal from localStorage or use default
  initializeWaterGoal();
}

/**
 * Add a drink to the tracking list
 */
// Utility function to generate a UUID v4
function generateUUIDv4() {
  // https://stackoverflow.com/a/2117523/65387
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function addDrink() {
  // Get the selected drink type from active button
  const drinkTypeBtn = document.querySelector('.btn-track[data-track="drink_type"].active');
  if (!drinkTypeBtn) {
    showNotification('Please select a drink type', 'warning');
    return;
  }

  // Get the amount
  const amount = document.getElementById('drink-amount').value;
  if (!amount || isNaN(amount) || amount <= 0) {
    showNotification('Please enter a valid drink amount', 'warning');
    return;
  }

  const drink_type = drinkTypeBtn.dataset.value;
  const unit = document.getElementById('drink-unit').value;
  // Get intake time as ISO string (combine today's date with input time)
  let intakeTimeInput = document.getElementById('intake-time').value;
  let drink_time;
  if (intakeTimeInput) {
    // Combine today's date with input time
    const today = new Date();
    const [hours, minutes] = intakeTimeInput.split(':');
    today.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    drink_time = today.toISOString();
  } else {
    drink_time = new Date().toISOString();
  }

  // Convert to ml for consistent tracking
  let volume_ml = parseInt(amount);
  if (unit === 'oz') {
    volume_ml = Math.round(volume_ml * 29.5735);
  } else if (unit === 'cup') {
    volume_ml = Math.round(volume_ml * 237);
  } else if (unit === 'glass') {
    volume_ml = Math.round(volume_ml * 250);
  }

  // Calculate sugar_g based on drink type
  let sugar_g = 0;
  if (drink_type === 'juice') {
    sugar_g = volume_ml * 0.1; // 10g per 100ml
  } else if (drink_type === 'soda') {
    sugar_g = volume_ml * 0.11; // 11g per 100ml
  } else if (drink_type === 'coffee') {
    sugar_g = 5; // Assuming 5g per cup
  }

  // Sodium estimation (optional, set to 0 if not used)
  let sodium_mg = 0;

  // Generate a valid UUID v4 for drink_id
  // Fetch user_id from the server (current user endpoint)
  let user_id = null;
  try {
    const userResponse = await fetch('/auth/current_user', {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('authToken')
      }
    });
    if (userResponse.ok) {
      const userData = await userResponse.json();
      user_id = userData.id || userData.user_id;
    }
  } catch (err) {
    showNotification('Failed to fetch user ID. Please try again.', 'error');
    return;
  }
  if (!user_id) {
    showNotification('Failed to fetch user ID. Please try again.', 'error');
    return;
  }
  const drink_id = generateUUIDv4();

  // Add to UI immediately for better responsiveness
  addDrinkToList({
    id: drink_id,
    type: drink_type,
    amount: `${amount} ${unit} (${volume_ml}ml)`,
    time: drink_time
  });

  // Store data for analytics
  storeDrinkLocally({
    id: drink_id,
    type: drink_type,
    volumeMl: volume_ml,
    sugar: sugar_g,
    sodium: sodium_mg,
    timestamp: drink_time
  });

  // Send to server
  fetch('/drink/drink-intake', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + localStorage.getItem('authToken')
    },
    body: JSON.stringify({
      user_id: user_id,
      drink_id: drink_id,
      drink_type: drink_type,
      drink_time: drink_time,
      volume_ml: volume_ml,
      sugar_g: sugar_g,
      sodium_mg: sodium_mg
    })
  })
    .then(response => {
      if (!response.ok) {
        console.error('Server error:', response.status, response.statusText);
        throw new Error(`Server error: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Drink saved to server:', data);
      showNotification('Drink added successfully', 'success');
      document.getElementById('drink-amount').value = '1'; // Reset to default value
    })
    .catch(error => {
      console.error('Error saving drink:', error);
      showNotification(`Drink tracked locally. Server error: ${error.message}`, 'warning');
    });
}

/**
 * Add a drink entry to the displayed list
 * @param {Object} drink - Drink entry object
 */
function addDrinkToList(drink) {
  const listContainer = document.getElementById('drink-items-list');
  const noItemsMessage = listContainer.querySelector('.no-items-message');

  if (noItemsMessage) {
    noItemsMessage.remove();
  }

  // Create drink entry element
  const drinkEntry = document.createElement('div');
  drinkEntry.className = 'tracked-item';
  drinkEntry.dataset.id = drink.id;

  // Get appropriate icon based on drink type
  let icon = 'glass-whiskey';
  switch (drink.type) {
    case 'water': icon = 'tint'; break;
    case 'coffee': icon = 'coffee'; break;
    case 'green_tea':
    case 'black_tea': icon = 'mug-hot'; break;
    case 'juice': icon = 'glass-whiskey'; break;
    case 'soda': icon = 'glass-cheers'; break;
  }

  // Format drink type for display
  const typeDisplay = drink.type.replace('_', ' ');

  drinkEntry.innerHTML = `
    <div>
      <i class="fas fa-${icon} item-icon"></i>
      <strong>${typeDisplay.charAt(0).toUpperCase() + typeDisplay.slice(1)}:</strong>
      ${drink.amount}
    </div>
    <div class="item-time">${drink.time}</div>
  `;

  listContainer.appendChild(drinkEntry);
}

/**
 * Set the current time in the intake time input
 */
function setCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('intake-time').value = `${hours}:${minutes}`;
}

/**
 * Initialize water goal from localStorage or use default
 */
function initializeWaterGoal() {
  const waterGoal = localStorage.getItem('waterGoalMl') || 2000; // Default 2000ml

  // Update water goal text
  updateWaterGoalText(0, waterGoal);

  // Get today's water intake
  const todayWaterIntake = getTodayWaterIntake();
  if (todayWaterIntake > 0) {
    updateWaterProgress(0); // This will recalculate based on stored data
  }
}

/**
 * Get today's water intake from stored data
 * @returns {number} Total water intake in ml
 */
function getTodayWaterIntake() {
  const drinkData = getDrinkData();
  let totalWater = 0;

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Sum up water intake for today
  drinkData.forEach(drink => {
    const drinkDate = new Date(drink.timestamp).toISOString().split('T')[0];
    if (drinkDate === today && drink.type === 'water') {
      totalWater += drink.volumeMl;
    }
  });

  return totalWater;
}

/**
 * Update water progress with new intake
 * @param {number} newIntakeMl - New water intake in ml
 */
function updateWaterProgress(newIntakeMl) {
  // Get water goal
  const waterGoal = parseInt(localStorage.getItem('waterGoalMl') || 2000);

  // Get current total
  let currentTotal = parseInt(localStorage.getItem('todayWaterMl') || 0);

  // Add new intake
  currentTotal += newIntakeMl;

  // Store updated total
  localStorage.setItem('todayWaterMl', currentTotal);

  // Calculate percentage
  const percentage = Math.min(Math.round((currentTotal / waterGoal) * 100), 100);

  // Update progress bar
  const progressBar = document.getElementById('water-progress');
  progressBar.style.width = `${percentage}%`;
  progressBar.textContent = `${percentage}%`;

  // Update goal text
  updateWaterGoalText(currentTotal, waterGoal);

  // Show achievement notification if reached 100%
  if (percentage === 100 && newIntakeMl > 0) {
    showNotification('Congratulations! You reached your daily water goal!', 'success');
  }
}

/**
 * Update water goal text
 * @param {number} current - Current water intake
 * @param {number} goal - Water goal
 */
function updateWaterGoalText(current, goal) {
  const goalText = document.querySelector('.goal-text');
  if (goalText) {
    goalText.textContent = `${current}/${goal} ml`;
  }
}

/**
 * Store drink data in localStorage for analytics
 * @param {Object} drink - Drink item to store
 */
function storeDrinkLocally(drink) {
  // Get existing drink data
  const drinks = getDrinkData();

  // Add new drink
  drinks.push(drink);

  // Store back in localStorage
  localStorage.setItem('drinkData', JSON.stringify(drinks));
}

/**
 * Get drink data from localStorage
 * @returns {Array} Stored drink data
 */
function getDrinkData() {
  try {
    return JSON.parse(localStorage.getItem('drinkData') || '[]');
  } catch (e) {
    console.error('Error parsing drink data from localStorage:', e);
    return [];
  }
}

/**
 * Show notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, info, warning, error)
 */
function showNotification(message, type = 'info') {
  // Create container if doesn't exist
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    document.body.appendChild(container);
  }

  // Create notification
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span>${message}</span>
    <button class="close-btn">&times;</button>
  `;

  // Add close functionality
  notification.querySelector('.close-btn').addEventListener('click', function () {
    container.removeChild(notification);
  });

  // Add to container
  container.appendChild(notification);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (container.contains(notification)) {
      container.removeChild(notification);
    }
  }, 5000);
}

// Initialize drink tracking when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  initDrinkTracking();
});

// ============================================
// SECTION 4: ANALYTICS FUNCTIONS
// ============================================

// ...existing code above...

/**
 * Initialize analytics functionality
 */
function initializeAnalytics() {
  // Set up event listeners for interval buttons
  document.querySelectorAll('.interval-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      // Remove active class from all interval buttons
      document.querySelectorAll('.interval-btn').forEach(b => b.classList.remove('active'));

      // Add active class to clicked button
      this.classList.add('active');

      // Load analytics data for selected interval
      const interval = this.dataset.interval;
      loadAnalyticsData(interval);
    });
  });

  // Load initial analytics data (default: 7 days)
  loadAnalyticsData('7');
}

/**
 * Load analytics data and update charts
 * @param {string} interval - Number of days to display (7 or 30)
 */
function loadAnalyticsData(interval = '7') {
  console.log(`Loading analytics data for ${interval} days`);

  // Show loading indicator (optional)
  const loadingIndicator = document.createElement('div');
  loadingIndicator.id = 'analytics-loading';
  loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Loading analytics...</span>';
  document.querySelector('#analytics .metric-card').appendChild(loadingIndicator);

  // Get food and drink data from localStorage or API
  const foodData = getFoodData();
  const drinkData = getDrinkData();

  // Process data for charts
  const days = parseInt(interval);
  const analytics = processAnalyticsData(foodData, drinkData, days);

  // Update UI with processed data
  setTimeout(() => {
    // Remove loading indicator
    const indicator = document.getElementById('analytics-loading');
    if (indicator) indicator.remove();

    // Update summary cards
    updateNutritionSummary(analytics);

    // Create/update charts
    createNutritionPieChart(analytics);
    createNutritionLineChart(analytics, days);
    createNutritionBarChart(analytics);
  }, 300); // Small delay for loading indicator effect
}

/**
 * Process food and drink data for analytics
 * @param {Array} foodData - Array of food intake records
 * @param {Array} drinkData - Array of drink intake records
 * @param {number} days - Number of days to include
 * @returns {Object} Processed analytics data
 */
function processAnalyticsData(foodData, drinkData, days) {
  // Set date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Filter data to date range
  const filteredFood = foodData.filter(item => {
    const itemDate = new Date(item.timestamp);
    return itemDate >= startDate && itemDate <= endDate;
  });

  const filteredDrink = drinkData.filter(item => {
    const itemDate = new Date(item.timestamp);
    return itemDate >= startDate && itemDate <= endDate;
  });

  // Initialize tracking objects
  const dailyNutrition = {};
  const caloriesByCategory = {};
  let totalCalories = 0;
  let totalProteins = 0;
  let totalCarbs = 0;
  let totalFats = 0;
  let totalSugar = 0;

  // Process all days in range to avoid gaps
  for (let i = 0; i < days; i++) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString();

    dailyNutrition[dateStr] = {
      calories: 0,
      proteins: 0,
      carbs: 0,
      fats: 0,
      sugar: 0
    };
  }

  // Process food data
  filteredFood.forEach(food => {
    const date = new Date(food.timestamp);
    const dateStr = date.toLocaleDateString();

    // Add to daily tracking
    if (!dailyNutrition[dateStr]) {
      dailyNutrition[dateStr] = {
        calories: 0,
        proteins: 0,
        carbs: 0,
        fats: 0,
        sugar: 0
      };
    }

    dailyNutrition[dateStr].calories += food.calories || 0;
    dailyNutrition[dateStr].proteins += food.proteins || 0;
    dailyNutrition[dateStr].carbs += food.carbs || 0;
    dailyNutrition[dateStr].fats += food.fats || 0;
    dailyNutrition[dateStr].sugar += food.sugar || 0;

    // Track by meal category
    const category = food.category || 'uncategorized';
    if (!caloriesByCategory[category]) {
      caloriesByCategory[category] = 0;
    }
    caloriesByCategory[category] += food.calories || 0;

    // Add to totals
    totalCalories += food.calories || 0;
    totalProteins += food.proteins || 0;
    totalCarbs += food.carbs || 0;
    totalFats += food.fats || 0;
    totalSugar += food.sugar || 0;
  });

  // Add sugar from drinks to daily tracking
  filteredDrink.forEach(drink => {
    const date = new Date(drink.timestamp);
    const dateStr = date.toLocaleDateString();

    if (!dailyNutrition[dateStr]) {
      dailyNutrition[dateStr] = {
        calories: 0,
        proteins: 0,
        carbs: 0,
        fats: 0,
        sugar: 0
      };
    }

    // Add sugar from drinks
    dailyNutrition[dateStr].sugar += drink.sugar || 0;
    totalSugar += drink.sugar || 0;
  });

  // Calculate daily recommended values percentages
  // Based on general guidelines: 50g protein, 275g carbs, 70g fat, 25g sugar
  const dailyRecommended = {
    proteins: 50,
    carbs: 275,
    fats: 70,
    sugar: 25
  };

  const avgProteins = totalProteins / days;
  const avgCarbs = totalCarbs / days;
  const avgFats = totalFats / days;
  const avgSugar = totalSugar / days;

  const percentageOfDailyTargets = {
    proteins: (avgProteins / dailyRecommended.proteins) * 100,
    carbs: (avgCarbs / dailyRecommended.carbs) * 100,
    fats: (avgFats / dailyRecommended.fats) * 100,
    sugar: (avgSugar / dailyRecommended.sugar) * 100
  };

  return {
    dailyNutrition,
    caloriesByCategory,
    totalCalories,
    totalProteins,
    totalCarbs,
    totalFats,
    totalSugar,
    percentageOfDailyTargets
  };
}

/**
 * Update nutrition summary cards
 * @param {Object} analytics - Processed analytics data
 */
function updateNutritionSummary(analytics) {
  document.getElementById('protein-percentage').textContent =
    `${Math.round(analytics.percentageOfDailyTargets.proteins)}%`;

  document.getElementById('carbs-percentage').textContent =
    `${Math.round(analytics.percentageOfDailyTargets.carbs)}%`;

  document.getElementById('fats-percentage').textContent =
    `${Math.round(analytics.percentageOfDailyTargets.fats)}%`;

  document.getElementById('sugar-percentage').textContent =
    `${Math.round(analytics.percentageOfDailyTargets.sugar)}%`;
}

/**
 * Create or update nutrition pie chart
 * @param {Object} analytics - Processed analytics data
 */
function createNutritionPieChart(analytics) {
  const ctx = document.getElementById('nutrition-pie-chart');

  // Destroy existing chart if it exists
  if (window.nutritionPieChart) {
    window.nutritionPieChart.destroy();
  }

  // Calculate total grams of macronutrients
  const totalGrams = analytics.totalProteins + analytics.totalCarbs + analytics.totalFats;

  // Create chart data
  const data = {
    labels: ['Proteins', 'Carbs', 'Fats'],
    datasets: [{
      data: [
        analytics.totalProteins,
        analytics.totalCarbs,
        analytics.totalFats
      ],
      backgroundColor: [
        'rgba(54, 162, 235, 0.7)', // Blue
        'rgba(255, 99, 132, 0.7)', // Red
        'rgba(255, 206, 86, 0.7)'  // Yellow
      ],
      borderColor: [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(255, 206, 86, 1)'
      ],
      borderWidth: 1
    }]
  };

  // Create chart
  window.nutritionPieChart = new Chart(ctx, {
    type: 'pie',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              const value = context.raw;
              const percentage = totalGrams > 0
                ? ((value / totalGrams) * 100).toFixed(1)
                : 0;
              return `${context.label}: ${value.toFixed(1)}g (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

/**
 * Create or update nutrition line chart
 * @param {Object} analytics - Processed analytics data
 * @param {number} days - Number of days to display
 */
function createNutritionLineChart(analytics, days) {
  const ctx = document.getElementById('nutrition-line-chart');

  // Destroy existing chart if it exists
  if (window.nutritionLineChart) {
    window.nutritionLineChart.destroy();
  }

  // Generate date labels for the past X days
  const dateLabels = [];
  const caloriesData = [];
  const proteinsData = [];
  const carbsData = [];
  const fatsData = [];
  const sugarData = [];

  // Generate chart data for each day
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString();

    dateLabels.push(dateStr);

    const dayData = analytics.dailyNutrition[dateStr] || {
      calories: 0, proteins: 0, carbs: 0, fats: 0, sugar: 0
    };

    caloriesData.push(dayData.calories);
    proteinsData.push(dayData.proteins);
    carbsData.push(dayData.carbs);
    fatsData.push(dayData.fats);
    sugarData.push(dayData.sugar);
  }

  // Prepare data
  const data = {
    labels: dateLabels,
    datasets: [
      {
        label: 'Calories',
        data: caloriesData,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        yAxisID: 'y',
        fill: true
      },
      {
        label: 'Proteins (g)',
        data: proteinsData,
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        yAxisID: 'y1',
        fill: true
      },
      {
        label: 'Carbs (g)',
        data: carbsData,
        borderColor: 'rgba(255, 206, 86, 1)',
        backgroundColor: 'rgba(255, 206, 86, 0.2)',
        yAxisID: 'y1',
        fill: true
      },
      {
        label: 'Fats (g)',
        data: fatsData,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        yAxisID: 'y1',
        fill: true
      },
      {
        label: 'Sugar (g)',
        data: sugarData,
        borderColor: 'rgba(153, 102, 255, 1)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        yAxisID: 'y1',
        fill: true
      }
    ]
  };

  // Create chart
  window.nutritionLineChart = new Chart(ctx, {
    type: 'line',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Calories'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Grams'
          },
          grid: {
            drawOnChartArea: false,
          },
        }
      }
    }
  });
}

/**
 * Create or update nutrition bar chart
 * @param {Object} analytics - Processed analytics data
 */
function createNutritionBarChart(analytics) {
  const ctx = document.getElementById('nutrition-bar-chart');

  // Destroy existing chart if it exists
  if (window.nutritionBarChart) {
    window.nutritionBarChart.destroy();
  }

  // Prepare data
  const data = {
    labels: ['Proteins', 'Carbs', 'Fats', 'Sugar'],
    datasets: [{
      label: '% of Daily Recommended Value',
      data: [
        Math.min(analytics.percentageOfDailyTargets.proteins, 200),
        Math.min(analytics.percentageOfDailyTargets.carbs, 200),
        Math.min(analytics.percentageOfDailyTargets.fats, 200),
        Math.min(analytics.percentageOfDailyTargets.sugar, 200)
      ],
      backgroundColor: [
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)'
      ],
      borderColor: [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)'
      ],
      borderWidth: 1
    }]
  };

  // Create chart
  window.nutritionBarChart = new Chart(ctx, {
    type: 'bar',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 200,
          title: {
            display: true,
            text: 'Percentage (%)'
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.label}: ${context.raw.toFixed(1)}% of daily target`;
            }
          }
        }
      }
    }
  });
}

/**
 * Get food data from localStorage
 * @returns {Array} Array of food entries
 */
function getFoodData() {
  try {
    return JSON.parse(localStorage.getItem('foodData') || '[]');
  } catch (error) {
    console.error('Error reading food data from localStorage:', error);
    return [];
  }
}

/**
 * Get drink data from localStorage
 * @returns {Array} Array of drink entries
 */
function getDrinkData() {
  try {
    return JSON.parse(localStorage.getItem('drinkData') || '[]');
  } catch (error) {
    console.error('Error reading drink data from localStorage:', error);
    return [];
  }
}

// Initialize analytics when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  // Add tab click handler for analytics
  document.querySelector('.tab-button[onclick="showSection(\'analytics\')"]').addEventListener('click', function () {
    // Re-load analytics data when tab is activated
    loadAnalyticsData(document.querySelector('.interval-btn.active').dataset.interval || '7');
  });

  // Initialize analytics
  initializeAnalytics();
});
// ============================================
// SECTION 5: UTILITY FUNCTIONS
// ============================================

/**
 * Fetch current user information from the server
 * @returns {Promise<Object>} User data
 */
function fetchCurrentUser() {
  return fetch('/auth/current_user')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      return response.json();
    });
}

/**
 * Get food data from localStorage
 * @returns {Array} Array of food items
 */
function getFoodData() {
  return JSON.parse(localStorage.getItem('foodData') || '[]');
}

/**
 * Get drink data from localStorage
 * @returns {Array} Array of drink items
 */
function getDrinkData() {
  return JSON.parse(localStorage.getItem('drinkData') || '[]');
}

/**
 * Add event listeners to tracking buttons
 */
document.addEventListener('DOMContentLoaded', function () {
  // Add click event to all tracking buttons
  document.querySelectorAll('.btn-track').forEach(button => {
    button.addEventListener('click', function () {
      // Get the track type (meal_type, drink_type, etc.)
      const trackType = this.dataset.track;

      // Remove active class from all buttons of this type
      document.querySelectorAll(`.btn-track[data-track="${trackType}"]`).forEach(btn => {
        btn.classList.remove('active');
      });

      // Add active class to this button
      this.classList.add('active');
    });
  });
});