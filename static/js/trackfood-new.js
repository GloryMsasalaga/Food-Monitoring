// Dashboard JavaScript for Server Communication
// Add this to your dashboard.js file or create a new one

class DashboardAPI {
    constructor() {
        this.baseURL = ''; // Adjust based on your server setup
        this.currentUser = null;
        this.selectedMealType = null;
        this.selectedDrinkType = null;
        this.dailyWaterGoal = 2000; // ml
        this.currentWaterIntake = 0;

        this.init();
    }

    init() {
        this.bindEventListeners();
        this.loadUserData();
        this.loadDailyProgress();
        this.setCurrentTime();
    }

    // API Helper Methods
    async apiCall(endpoint, method = 'GET', data = null) {
        try {
            // Map frontend endpoint patterns to actual backend endpoints
            let mappedEndpoint = endpoint;
            if (endpoint.startsWith('/user/profile')) {
                mappedEndpoint = '/secure/me';
            } else if (endpoint.startsWith('/food-intake')) {
                mappedEndpoint = '/food' + endpoint;
            } else if (endpoint.startsWith('/drink-intake')) {
                mappedEndpoint = '/drink' + endpoint;
            } else if (endpoint.startsWith('/water-progress')) {
                mappedEndpoint = '/health/water' + endpoint.replace('/water-progress', '');
            } else if (endpoint.startsWith('/user/preferences')) {
                mappedEndpoint = '/preference/get';
            } else if (endpoint.startsWith('/analytics/nutrition')) {
                mappedEndpoint = '/intake-analysis/weekly-food';
            }

            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                }
            };

            if (data && method !== 'GET') {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(`${this.baseURL}${mappedEndpoint}`, options);

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Call Error:', error);
            this.showNotification('Error communicating with server', 'error');
            throw error;
        }
    }
    // Event Listeners
    bindEventListeners() {
        // Meal type selection
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                // Extract sectionId from the onclick attribute instead of text content
                const onclickAttr = button.getAttribute('onclick') || '';
                const sectionIdMatch = onclickAttr.match(/showSection\(['"](.+?)['"]\)/);
                if (sectionIdMatch && sectionIdMatch[1]) {
                    this.showSection(sectionIdMatch[1]);
                }
            });
        });

        // Drink type selection
        document.querySelectorAll('[data-track="drink_type"]').forEach(button => {
            button.addEventListener('click', (e) => {
                this.selectDrinkType(e.target.dataset.value, e.target);
            });
        });

        // Food items
        document.getElementById('add-food-items').addEventListener('click', () => {
            this.addFoodItems();
        });

        // Drink tracking
        document.getElementById('add-drink').addEventListener('click', () => {
            this.addDrink();
        });

        // Current time button
        document.getElementById('set-current-time').addEventListener('click', () => {
            this.setCurrentTime();
        });

        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const section = e.target.textContent.toLowerCase().replace(' ', '');
                this.showSection(section);
            });
        });

        // Analytics interval buttons
        document.querySelectorAll('.interval-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                this.changeAnalyticsInterval(e.target.dataset.interval);
            });
        });

        // Edit preferences button
        const editPrefBtn = document.getElementById('edit-preference-btn');
        if (editPrefBtn) {
            editPrefBtn.addEventListener('click', () => {
                this.editPreferences();
            });
        }
    }

    // Meal Type Selection
    selectMealType(mealType, buttonElement) {
        // Remove active class from all meal type buttons
        document.querySelectorAll('[data-track="meal_type"]').forEach(btn => {
            btn.classList.remove('active');
        });

        // Add active class to selected button
        buttonElement.classList.add('active');
        this.selectedMealType = mealType;

        this.showNotification(`Selected ${mealType} for food tracking`, 'info');
    }

    // Drink Type Selection
    selectDrinkType(drinkType, buttonElement) {
        // Remove active class from all drink type buttons
        document.querySelectorAll('[data-track="drink_type"]').forEach(btn => {
            btn.classList.remove('active');
        });

        // Add active class to selected button
        buttonElement.classList.add('active');
        this.selectedDrinkType = drinkType;

        this.showNotification(`Selected ${drinkType} for drink tracking`, 'info');
    }

    // Add Food Items
    async addFoodItems() {
        const foodInput = document.getElementById('food-items-input');
        const intakeTime = document.getElementById('intake-time');

        if (!foodInput.value.trim()) {
            this.showNotification('Please enter food items', 'warning');
            return;
        }

        if (!this.selectedMealType) {
            this.showNotification('Please select a meal type first', 'warning');
            return;
        }

        const foodItems = foodInput.value.split(',').map(item => item.trim());
        const timeValue = intakeTime.value || this.getCurrentTime();

        const foodData = {
            meal_type: this.selectedMealType,
            food_items: foodItems,
            intake_time: timeValue,
            date: new Date().toISOString().split('T')[0]
        };

        try {
            const response = await this.apiCall('/food-intake', 'POST', foodData);

            if (response.success) {
                this.showNotification('Food items added successfully!', 'success');
                this.updateFoodItemsList(foodItems, this.selectedMealType, timeValue);
                foodInput.value = '';

                // Optionally reload nutrition analytics
                this.loadNutritionAnalytics();
            }
        } catch (error) {
            this.showNotification('Failed to add food items', 'error');
        }
    }

    // Add Drink
    async addDrink() {
        const drinkAmount = document.getElementById('drink-amount');
        const drinkUnit = document.getElementById('drink-unit');
        const intakeTime = document.getElementById('intake-time');

        if (!this.selectedDrinkType) {
            this.showNotification('Please select a drink type first', 'warning');
            return;
        }

        if (!drinkAmount.value || drinkAmount.value <= 0) {
            this.showNotification('Please enter a valid drink amount', 'warning');
            return;
        }

        const timeValue = intakeTime.value || this.getCurrentTime();

        const drinkData = {
            drink_type: this.selectedDrinkType,
            amount: parseFloat(drinkAmount.value),
            unit: drinkUnit.value,
            intake_time: timeValue,
            date: new Date().toISOString().split('T')[0]
        };

        try {
            const response = await this.apiCall('/drink-intake', 'POST', drinkData);

            if (response.success) {
                this.showNotification('Drink added successfully!', 'success');
                this.updateDrinkItemsList(drinkData);

                // Update water progress if it's water
                if (this.selectedDrinkType === 'water') {
                    this.updateWaterProgress(drinkData.amount, drinkData.unit);
                }

                // Reset form
                drinkAmount.value = 1;
            }
        } catch (error) {
            this.showNotification('Failed to add drink', 'error');
        }
    }

    // Update Food Items List UI
    updateFoodItemsList(foodItems, mealType, time) {
        const foodList = document.getElementById('food-items-list');
        const noItemsMsg = foodList.querySelector('.no-items-message');

        if (noItemsMsg) {
            noItemsMsg.remove();
        }

        foodItems.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'tracked-item';
            itemDiv.innerHTML = `
                <span><i class="item-icon fas fa-utensils"></i>${item} (${mealType})</span>
                <span class="item-time">${time}</span>
            `;
            foodList.appendChild(itemDiv);
        });
    }

    // Update Drink Items List UI
    updateDrinkItemsList(drinkData) {
        const drinkList = document.getElementById('drink-items-list');
        const noItemsMsg = drinkList.querySelector('.no-items-message');

        if (noItemsMsg) {
            noItemsMsg.remove();
        }

        const itemDiv = document.createElement('div');
        itemDiv.className = 'tracked-item';
        const drinkIcon = this.getDrinkIcon(drinkData.drink_type);

        itemDiv.innerHTML = `
            <span><i class="item-icon ${drinkIcon}"></i>${drinkData.amount} ${drinkData.unit} ${drinkData.drink_type}</span>
            <span class="item-time">${drinkData.intake_time}</span>
        `;
        drinkList.appendChild(itemDiv);
    }

    // Update Water Progress
    updateWaterProgress(amount, unit) {
        // Convert to ml for calculation
        let mlAmount = amount;
        switch (unit) {
            case 'oz':
                mlAmount = amount * 29.5735;
                break;
            case 'cup':
                mlAmount = amount * 240;
                break;
            case 'glass':
                mlAmount = amount * 250;
                break;
        }

        this.currentWaterIntake += mlAmount;
        const percentage = Math.min((this.currentWaterIntake / this.dailyWaterGoal) * 100, 100);

        const progressBar = document.getElementById('water-progress');
        const goalText = document.querySelector('.goal-text');

        progressBar.style.width = `${percentage}%`;
        progressBar.textContent = `${Math.round(percentage)}%`;
        goalText.textContent = `${Math.round(this.currentWaterIntake)}/${this.dailyWaterGoal} ml`;

        // Save water progress to server
        this.saveWaterProgress();
    }

    // Save Water Progress to Server
    async saveWaterProgress() {
        const progressData = {
            current_intake: this.currentWaterIntake,
            daily_goal: this.dailyWaterGoal,
            date: new Date().toISOString().split('T')[0]
        };

        try {
            await this.apiCall('/water-progress', 'POST', progressData);
        } catch (error) {
            console.error('Failed to save water progress:', error);
        }
    }

    // Load User Data
    async loadUserData() {
        try {
            const userData = await this.apiCall('/user/profile');
            this.currentUser = userData;
        } catch (error) {
            console.error('Failed to load user data:', error);
        }
    }

    // Load Daily Progress
    async loadDailyProgress() {
        try {
            const today = new Date().toISOString().split('T')[0];

            // These are likely the failing API calls
            const foodResponse = await this.apiCall(`/food-intake?date=${today}`);
            const drinkResponse = await this.apiCall(`/drink-intake?date=${today}`);

            if (foodResponse && foodResponse.items) {
                this.displayFoodItems(foodResponse.items);
            }

            if (drinkResponse && drinkResponse.items) {
                this.displayDrinkItems(drinkResponse.items);
            }

            // Also potentially failing
            await this.updateWaterProgressDisplay();
        } catch (error) {
            console.error("Failed to load daily progress:", error);
        }
    }

    // Display Food Items from Server
    displayFoodItems(items) {
        const foodList = document.getElementById('food-items-list');
        foodList.innerHTML = '';

        if (items.length === 0) {
            foodList.innerHTML = '<p class="no-items-message">No food items recorded today</p>';
            return;
        }

        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'tracked-item';
            itemDiv.innerHTML = `
                <span><i class="item-icon fas fa-utensils"></i>${item.food_items.join(', ')} (${item.meal_type})</span>
                <span class="item-time">${item.intake_time}</span>
            `;
            foodList.appendChild(itemDiv);
        });
    }

    // Display Drink Items from Server
    displayDrinkItems(items) {
        const drinkList = document.getElementById('drink-items-list');
        drinkList.innerHTML = '';

        if (items.length === 0) {
            drinkList.innerHTML = '<p class="no-items-message">No drinks recorded today</p>';
            return;
        }

        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'tracked-item';
            const drinkIcon = this.getDrinkIcon(item.drink_type);

            itemDiv.innerHTML = `
                <span><i class="item-icon ${drinkIcon}"></i>${item.amount} ${item.unit} ${item.drink_type}</span>
                <span class="item-time">${item.intake_time}</span>
            `;
            drinkList.appendChild(itemDiv);
        });
    }

    // Load Nutrition Analytics
    async loadNutritionAnalytics() {
        try {
            const interval = document.querySelector('.interval-btn.active').dataset.interval;
            const analyticsData = await this.apiCall(`/analytics/nutrition?days=${interval}`);

            // Update charts and summary cards
            this.updateNutritionCharts(analyticsData);
            this.updateSummaryCards(analyticsData.summary);

        } catch (error) {
            console.error('Failed to load nutrition analytics:', error);
        }
    }

    // Utility Methods
    getCurrentTime() {
        const now = new Date();
        return now.toTimeString().slice(0, 5);
    }

    setCurrentTime() {
        const timeInput = document.getElementById('intake-time');
        timeInput.value = this.getCurrentTime();
    }

    getDrinkIcon(drinkType) {
        const icons = {
            'water': 'fas fa-tint',
            'green_tea': 'fas fa-mug-hot',
            'black_tea': 'fas fa-mug-hot',
            'coffee': 'fas fa-coffee',
            'juice': 'fas fa-glass-whiskey',
            'soda': 'fas fa-glass-cheers'
        };
        return icons[drinkType] || 'fas fa-glass';
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification container if it doesn't exist
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            document.body.appendChild(container);
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;">×</button>
        `;

        container.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // Tab switching
    showSection(sectionId) {
        // Update button states
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });

        // Find the button for this section and make it active
        const activeButton = document.querySelector(`.tab-button[onclick="showSection('${sectionId}')"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }

        // Update content sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Load section-specific data
        if (sectionId === 'analytics') {
            this.loadNutritionAnalytics();
        } else if (sectionId === 'preferences') {
            this.loadUserPreferences();
        }
    }
    // Load User Preferences
    async loadUserPreferences() {
        try {
            const preferences = await this.apiCall('/user/preferences');
            this.displayPreferences(preferences);
        } catch (error) {
            console.error('Failed to load preferences:', error);
        }
    }

    // Display preferences in UI
    displayPreferences(prefs) {
        document.getElementById('dietary_restriction-type-display').textContent = prefs.dietary_type || 'Not specified';
        document.getElementById('allergies-display').textContent = prefs.allergies?.join(', ') || 'None';
        document.getElementById('meal-times-display').textContent = prefs.meal_times?.join(', ') || 'Not specified';
        document.getElementById('favorite-foods-display').textContent = prefs.favorite_foods?.join(', ') || 'Not specified';
        document.getElementById('drink-preferences-display').textContent = prefs.drink_preferences?.join(', ') || 'Not specified';
        document.getElementById('meals-per-day-display').textContent = prefs.meals_per_day || 'Not specified';
        document.getElementById('health-condition-display').textContent = prefs.health_conditions?.join(', ') || 'None';
    }

    updateWaterProgressDisplay() {
        const percentage = Math.min((this.currentWaterIntake / this.dailyWaterGoal) * 100, 100);
        const progressBar = document.getElementById('water-progress');
        const goalText = document.querySelector('.goal-text');

        progressBar.style.width = `${percentage}%`;
        progressBar.textContent = `${Math.round(percentage)}%`;
        goalText.textContent = `${Math.round(this.currentWaterIntake)}/${this.dailyWaterGoal} ml`;
    }
}

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardAPI = new DashboardAPI();
});

// Global function for tab switching (called from HTML)
function showSection(sectionId) {
    // First call the original dashboard showSection function if it exists
    if (window.dashboardShowSection) {
        window.dashboardShowSection(sectionId);
    }

    // Then let the dashboardAPI handle any additional data loading for the section
    if (window.dashboardAPI) {
        // Only handle data loading, not UI switching
        if (sectionId === 'analytics') {
            window.dashboardAPI.loadNutritionAnalytics();
        } else if (sectionId === 'preferences') {
            window.dashboardAPI.loadUserPreferences();
        }
    }
}