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