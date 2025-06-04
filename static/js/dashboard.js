document.addEventListener('DOMContentLoaded', function () {
    // API Configuration - Moved up before usage
    const API_URL = '/preference';
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
    
    // Display elements mapping for preferences - Define before using
    const displayElements = {
        dietary_restrictions: document.getElementById('diet-type-display'),
        preffered_allergy: document.getElementById('allergies-display'),
        preferred_meal_time: document.getElementById('meal-times-display'),
        preferred_meal_type: document.getElementById('favorite-foods-display'),
        preferred_drink_type: document.getElementById('drinks-display'),
        meals_per_day: document.getElementById('meals-per-day-display'),
        disease: document.getElementById('health-condition-display')
    };
    
    // DOM Elements
    const elements = {
        editBtn: document.getElementById('edit-preference-btn'),
        cancelBtn: document.getElementById('cancel-edit-btn'),
        preferencesForm: document.getElementById('preferences-form'),
        preferenceView: document.getElementById('preference-view'),
        preferencesEdit: document.getElementById('preferences-edit'),
        tabButtons: document.querySelectorAll('.tab-button'),
        contentSections: document.querySelectorAll('.content-section')
    };

    // Debug logging
    console.log('Dashboard JavaScript loaded');
    console.log('API_URL set to:', API_URL);
    console.log('Display elements found:', {
        dietary_restrictions: !!displayElements.dietary_restrictions,
        preffered_allergy: !!displayElements.preffered_allergy,
        preferred_meal_time: !!displayElements.preferred_meal_time,
        preferred_meal_type: !!displayElements.preferred_meal_type,
        preferred_drink_type: !!displayElements.preferred_drink_type,
        meals_per_day: !!displayElements.meals_per_day,
        disease: !!displayElements.disease
    });

    // Initialize event listeners
    function initialize() {
        setupTabNavigation();
        setupFormHandlers();
        loadUserPreferences();
    }

    // Tab navigation handler
    function setupTabNavigation() {
        elements.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.getAttribute('onclick')?.match(/showSection\(['"](.+?)['"]\)/)?.[1];
                if (targetId) {
                    elements.tabButtons.forEach(btn => btn.classList.remove('active'));
                    elements.contentSections.forEach(section => section.classList.remove('active'));

                    button.classList.add('active');
                    document.getElementById(targetId).classList.add('active');

                    if (targetId === 'preferences') {
                        loadUserPreferences();
                    }
                }
            });
        });
    }

    // Form event handlers
    function setupFormHandlers() {
        if (elements.editBtn) {
            elements.editBtn.addEventListener('click', () => {
                toggleEditMode(true);
            });
        }

        if (elements.cancelBtn) {
            elements.cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                toggleEditMode(false);
            });
        }

        if (elements.preferencesForm) {
            elements.preferencesForm.addEventListener('submit', handleFormSubmit);
        }
    }

    // Toggle between view and edit modes
    function toggleEditMode(isEditMode) {
        if (elements.preferenceView) {
            elements.preferenceView.style.display = isEditMode ? 'none' : 'block';
        }
        if (elements.preferencesEdit) {
            elements.preferencesEdit.style.display = isEditMode ? 'block' : 'none';
        }
        if (!isEditMode) {
            loadUserPreferences();
        }
    }

    // Form validation
    function validateFormData(formData) {
        const errors = [];

        if (!formData.preferred_meal_type.trim()) {
            errors.push('Favorite foods cannot be empty');
        }

        if (!formData.dietary_restrictions) {
            errors.push('Please select a dietary_restrictions preference');
        }

        return errors;
    }

    // Form submission handler
    async function handleFormSubmit(e) {
        e.preventDefault();

        const formData = {
            preferred_meal_type: document.getElementById('preferred_meal_type')?.value || '',
            dietary_restrictions: document.querySelector('input[name="dietary_restrictions"]:checked')?.value,
            preffered_allergy: document.querySelector('input[name="preffered_allergy"]:checked')?.value,
            preferred_meal_time: document.querySelector('input[name="preferred_meal_time"]:checked')?.value,
            preferred_drink_type: document.querySelector('input[name="preferred_drink_type"]:checked')?.value,
            meals_per_day: document.querySelector('input[name="meals_per_day"]:checked')?.value,
            disease: document.querySelector('input[name="disease"]:checked')?.value
        };

        const validationErrors = validateFormData(formData);
        if (validationErrors.length > 0) {
            alert('Please fix the following errors:\n' + validationErrors.join('\n'));
            return;
        }

        try {
            const response = await fetch('/process_preference', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                credentials: 'include',
                body: new URLSearchParams(formData)
            });

            if (response.ok) {
                alert('Preferences saved successfully!');
                toggleEditMode(false);
            } else {
                try {
                    const errorData = await response.json();
                    alert(`Failed to save preferences: ${errorData.message || 'Unknown error'}`);
                } catch (jsonError) {
                    alert(`Failed to save preferences: ${response.status}`);
                }
            }
        } catch (error) {
            console.error('Error saving preferences:', error);
            alert('An error occurred while saving preferences. Please try again.');
        }
    }

    // Load user preferences - Fixed variable reassignment issue
    async function loadUserPreferences() {
        try {
            console.log('Fetching preferences from:', `${API_URL}/get`);
            let response = await fetch(`${API_URL}/get`, {  // Changed const to let
                method: 'GET',
                headers: defaultHeaders,
                credentials: 'include'
            });

            if (!response.ok && response.status === 404) {
                console.log('Primary endpoint not found, trying fallback...');
                response = await fetch('/dashboard/preference', {
                    method: 'GET',
                    headers: defaultHeaders,
                    credentials: 'include'
                });
            }

            console.log('Response status:', response.status);

            if (!response.ok) {
                if (response.status === 404) {
                    console.log('No preferences found');
                    Object.values(displayElements).forEach(el => {
                        if (el) el.textContent = 'Not set';
                    });
                    return;
                }
                const errorText = await response.text();
                throw new Error(`Failed to load preferences: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('Loaded preference data:', data);

            // Handle both direct data format and nested data format
            const preferenceData = data.preference || data;

            updatePreferencesDisplay(preferenceData);
            populateEditForm(preferenceData);
        } catch (error) {
            console.error('Error loading preferences:', error);
            Object.values(displayElements).forEach(el => {
                if (el) el.textContent = 'Error loading data';
            });
        }
    }

    // Update preferences display
    function updatePreferencesDisplay(data) {
        if (displayElements.dietary_restrictions) displayElements.dietary_restrictions.textContent = data.dietary_restrictions || 'Not set';
        if (displayElements.preferred_meal_type) displayElements.preferred_meal_type.textContent = data.preferred_meal_type || 'Not set';
        if (displayElements.preferred_meal_time) displayElements.preferred_meal_time.textContent = data.preferred_meal_time || 'Not set';
        if (displayElements.meals_per_day) displayElements.meals_per_day.textContent = data.meals_per_day || 'Not set';
        if (displayElements.preferred_drink_type) displayElements.preferred_drink_type.textContent = data.preferred_drink_type || 'Not set';
        if (displayElements.disease) displayElements.disease.textContent = data.disease || 'Not set';
        if (displayElements.preffered_allergy) displayElements.preffered_allergy.textContent = data.preffered_allergy || 'None';
    }

    // Populate edit form with existing preferences
    function populateEditForm(data) {
        const favoriteInput = document.getElementById('favorite-foods') || document.getElementById('preferred_meal_type');
        if (favoriteInput) {
            favoriteInput.value = data.preferred_meal_type || '';
        }

        setRadioValue('dietary_restrictions', data.dietary_restrictions);
        setRadioValue('preffered_allergy', data.preffered_allergy);
        setRadioValue('preferred_meal_time', data.preferred_meal_time);
        setRadioValue('preferred_drink_type', data.preferred_drink_type);
        setRadioValue('meals_per_day', data.meals_per_day?.toString());  // Convert number to string
        setRadioValue('disease', data.disease);
    }

    // Helper function to set radio button values
    function setRadioValue(name, value) {
        if (!value) return;
        const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
        if (radio) radio.checked = true;
    }

    // Initialize the application
    initialize();
});

document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    let selectedMealType = null;
    let selectedDrinkType = null;
    const waterGoal = 2000; // ml
    let waterConsumed = 0;
    const foodItems = [];
    const drinkItems = [];
    
    // Set current time as default
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('intake-time').value = `${hours}:${minutes}`;
    
    // Cache DOM elements
    const mealTypeButtons = document.querySelectorAll('.btn-track[data-track="meal_type"]');
    const drinkTypeButtons = document.querySelectorAll('.btn-track[data-track="drink_type"]');
    const intakeTimeInput = document.getElementById('intake-time');
    const setCurrentTimeBtn = document.getElementById('set-current-time');
    const foodItemsInput = document.getElementById('food-items-input');
    const addFoodItemsBtn = document.getElementById('add-food-items');
    const foodItemsList = document.getElementById('food-items-list');
    const drinkAmountInput = document.getElementById('drink-amount');
    const drinkUnitSelect = document.getElementById('drink-unit');
    const addDrinkBtn = document.getElementById('add-drink');
    const drinkItemsList = document.getElementById('drink-items-list');
    const waterProgressBar = document.getElementById('water-progress');
    
    // Event: Select a meal type
    mealTypeButtons.forEach(button => {
      button.addEventListener('click', function() {
        // Deactivate all buttons
        mealTypeButtons.forEach(btn => btn.classList.remove('active'));
        
        // Activate the selected button
        this.classList.add('active');
        selectedMealType = this.getAttribute('data-value');
      });
    });
    
    // Event: Select a drink type
    drinkTypeButtons.forEach(button => {
      button.addEventListener('click', function() {
        // Deactivate all buttons
        drinkTypeButtons.forEach(btn => btn.classList.remove('active'));
        
        // Activate the selected button
        this.classList.add('active');
        selectedDrinkType = this.getAttribute('data-value');
      });
    });
    
    // Event: Set current time
    setCurrentTimeBtn.addEventListener('click', function() {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      intakeTimeInput.value = `${hours}:${minutes}`;
    });
    
    // Event: Add food items
    addFoodItemsBtn.addEventListener('click', function() {
      const foodItemsText = foodItemsInput.value.trim();
      
      if (!foodItemsText) {
        showNotification('Please enter food items', 'warning');
        return;
      }
      
      if (!selectedMealType) {
        showNotification('Please select a meal type', 'warning');
        return;
      }
      
      const intakeTime = intakeTimeInput.value;
      if (!intakeTime) {
        showNotification('Please set an intake time', 'warning');
        return;
      }
      
      // Add to display
      addFoodToList(foodItemsText, selectedMealType, intakeTime);
      
      // Track to server
      trackFood(foodItemsText, selectedMealType, intakeTime);
      
      // Reset input
      foodItemsInput.value = '';
    });
    
    // Event: Add drink
    addDrinkBtn.addEventListener('click', function() {
      if (!selectedDrinkType) {
        showNotification('Please select a drink type', 'warning');
        return;
      }
      
      const amount = parseInt(drinkAmountInput.value);
      const unit = drinkUnitSelect.value;
      const intakeTime = intakeTimeInput.value;
      
      if (!amount || amount <= 0) {
        showNotification('Please enter a valid amount', 'warning');
        return;
      }
      
      if (!intakeTime) {
        showNotification('Please set an intake time', 'warning');
        return;
      }
      
      // Convert to ml for tracking
      let mlAmount = amount;
      switch(unit) {
        case 'oz':
          mlAmount = amount * 29.57;
          break;
        case 'cup':
          mlAmount = amount * 240;
          break;
        case 'glass':
          mlAmount = amount * 250;
          break;
      }
      
      // Add to water consumption if it's water
      if (selectedDrinkType === 'water') {
        updateWaterProgress(mlAmount);
      }
      
      // Add to display
      addDrinkToList(selectedDrinkType, amount, unit, intakeTime);
      
      // Track to server
      trackDrink(selectedDrinkType, amount, unit, intakeTime, mlAmount);
      
      // Reset input
      drinkAmountInput.value = 1;
    });
    
    // Function to update water progress
    function updateWaterProgress(mlAmount) {
      waterConsumed += mlAmount;
      const percentage = Math.min(Math.round((waterConsumed / waterGoal) * 100), 100);
      
      waterProgressBar.style.width = `${percentage}%`;
      waterProgressBar.textContent = `${percentage}%`;
      
      const goalText = document.querySelector('.goal-text');
      goalText.textContent = `${waterConsumed}/${waterGoal} ml`;
    }
    
    // Function to add food to list display
    function addFoodToList(foodItems, mealType, time) {
      // Remove "no items" message if it exists
      const noMessage = foodItemsList.querySelector('.no-items-message');
      if (noMessage) {
        noMessage.remove();
      }
      
      // Create food entry element
      const entry = document.createElement('div');
      entry.className = 'tracked-item';
      
      // Get appropriate icon for meal type
      let icon;
      switch(mealType) {
        case 'breakfast':
          icon = 'fa-bacon';
          break;
        case 'lunch':
          icon = 'fa-hamburger';
          break;
        case 'dinner':
          icon = 'fa-drumstick-bite';
          break;
        case 'snack':
          icon = 'fa-cookie';
          break;
        default:
          icon = 'fa-utensils';
      }
      
      // Format meal type for display
      const displayType = mealType.charAt(0).toUpperCase() + mealType.slice(1);
      
      entry.innerHTML = `
        <div class="item-info">
          <i class="fas ${icon} item-icon"></i>
          <span><strong>${displayType}:</strong> ${foodItems}</span>
        </div>
        <span class="item-time">${time}</span>
      `;
      
      // Add to the top of list
      foodItemsList.insertBefore(entry, foodItemsList.firstChild);
      
      // Save to local storage
      const foodTracking = {
        items: foodItems,
        mealType: mealType,
        time: time,
        timestamp: new Date().toISOString()
      };
      
      foodItems.push(foodTracking);
      localStorage.setItem('foodTracking', JSON.stringify(foodItems));
    }
    
    // Function to add drink to list display
    function addDrinkToList(drinkType, amount, unit, time) {
      // Remove "no items" message if it exists
      const noMessage = drinkItemsList.querySelector('.no-items-message');
      if (noMessage) {
        noMessage.remove();
      }
      
      // Create drink entry element
      const entry = document.createElement('div');
      entry.className = 'tracked-item';
      
      // Get appropriate icon
      let icon;
      switch(drinkType) {
        case 'water':
          icon = 'fa-tint';
          break;
        case 'green_tea':
        case 'black_tea':
          icon = 'fa-mug-hot';
          break;
        case 'coffee':
          icon = 'fa-coffee';
          break;
        case 'juice':
          icon = 'fa-glass-whiskey';
          break;
        case 'soda':
          icon = 'fa-glass-cheers';
          break;
        default:
          icon = 'fa-glass-water';
      }
      
      // Format drink type for display
      let displayType = drinkType.replace('_', ' ');
      displayType = displayType.charAt(0).toUpperCase() + displayType.slice(1);
      
      entry.innerHTML = `
        <div class="item-info">
          <i class="fas ${icon} item-icon"></i>
          <span><strong>${displayType}:</strong> ${amount} ${unit}</span>
        </div>
        <span class="item-time">${time}</span>
      `;
      
      // Add to the top of list
      drinkItemsList.insertBefore(entry, drinkItemsList.firstChild);
      
      // Save to local storage
      const drinkTracking = {
        type: drinkType,
        amount: amount,
        unit: unit,
        time: time,
        timestamp: new Date().toISOString()
      };
      
      drinkItems.push(drinkTracking);
      localStorage.setItem('drinkTracking', JSON.stringify(drinkItems));
    }
    
    // Function to track food to server
    async function trackFood(foodItems, mealType, intakeTime) {
      try {
        const response = await fetch('/food/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            food_items: foodItems,
            meal_type: mealType,
            intake_time: intakeTime,
            timestamp: new Date().toISOString()
          }),
          credentials: 'include'
        });
        
        if (response.ok) {
          showNotification(`${mealType.charAt(0).toUpperCase() + mealType.slice(1)} tracked successfully!`, 'success');
        } else {
          showNotification('Failed to track food. Saved locally.', 'warning');
        }
      } catch (error) {
        console.error('Error tracking food:', error);
        showNotification('Error tracking food. Saved locally.', 'warning');
      }
    }
    
    // Function to track drink to server
    async function trackDrink(drinkType, amount, unit, intakeTime, mlAmount) {
      try {
        const response = await fetch('/drink/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            drink_type: drinkType,
            amount: amount,
            unit: unit,
            intake_time: intakeTime,
            amount_ml: mlAmount,
            timestamp: new Date().toISOString()
          }),
          credentials: 'include'
        });
        
        if (response.ok) {
          showNotification(`${drinkType.replace('_', ' ')} tracked successfully!`, 'success');
        } else {
          showNotification('Failed to track drink. Saved locally.', 'warning');
        }
      } catch (error) {
        console.error('Error tracking drink:', error);
        showNotification('Error tracking drink. Saved locally.', 'warning');
      }
    }
    
    // Load food and drink history from local storage
    function loadTrackedItems() {
      // Load food tracking
      const savedFoodTracking = localStorage.getItem('foodTracking');
      if (savedFoodTracking) {
        const parsedFoodTracking = JSON.parse(savedFoodTracking);
        
        // Only show today's items
        const today = new Date().toDateString();
        const todayFoodItems = parsedFoodTracking.filter(item => {
          return new Date(item.timestamp).toDateString() === today;
        });
        
        // Add each food item to the display
        if (todayFoodItems.length > 0) {
          // Remove "no items" message
          const noMessage = foodItemsList.querySelector('.no-items-message');
          if (noMessage) {
            noMessage.remove();
          }
          
          todayFoodItems.forEach(item => {
            addFoodToList(item.items, item.mealType, item.time);
          });
        }
      }
      
      // Load drink tracking
      const savedDrinkTracking = localStorage.getItem('drinkTracking');
      if (savedDrinkTracking) {
        const parsedDrinkTracking = JSON.parse(savedDrinkTracking);
        
        // Only show today's items
        const today = new Date().toDateString();
        const todayDrinkItems = parsedDrinkTracking.filter(item => {
          return new Date(item.timestamp).toDateString() === today;
        });
        
        // Add each drink to the display and update water consumption
        if (todayDrinkItems.length > 0) {
          // Remove "no items" message
          const noMessage = drinkItemsList.querySelector('.no-items-message');
          if (noMessage) {
            noMessage.remove();
          }
          
          todayDrinkItems.forEach(item => {
            addDrinkToList(item.type, item.amount, item.unit, item.time);
            
            if (item.type === 'water') {
              // Convert to ml for water tracking
              let mlAmount = item.amount;
              switch(item.unit) {
                case 'oz':
                  mlAmount = item.amount * 29.57;
                  break;
                case 'cup':
                  mlAmount = item.amount * 240;
                  break;
                case 'glass':
                  mlAmount = item.amount * 250;
                  break;
              }
              updateWaterProgress(mlAmount);
            }
          });
        }
      }
    }
    
    // Notification function
    function showNotification(message, type = 'info') {
      // Check if notification container exists
      let container = document.getElementById('notification-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
      }
      
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.innerHTML = `
        <div class="notification-content">${message}</div>
        <button class="close-btn" style="background:none;border:none;color:white;font-size:16px;cursor:pointer;">&times;</button>
      `;
      
      container.appendChild(notification);
      
      notification.querySelector('.close-btn').addEventListener('click', function() {
        notification.remove();
      });
      
      setTimeout(() => {
        notification.remove();
      }, 5000);
    }
    
    // Load tracking history on page load
    loadTrackedItems();
    
    // Connect to tab navigation
    function showSection(sectionId) {
      // Hide all sections
      document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
      });
      
      // Show selected section
      document.getElementById(sectionId).classList.add('active');
      
      // Update active tab button
      document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
      });
      document.querySelector(`.tab-button[onclick="showSection('${sectionId}')"]`).classList.add('active');
    }
    
    // Make showSection available globally
    window.showSection = showSection;
  });