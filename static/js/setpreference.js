document.addEventListener("DOMContentLoaded", function () {
      // Initialize the first step
      showStep(0);
    });
    // JavaScript for Wizard Navigation
    const wizardCards = document.querySelectorAll('.wizard-card');
    let currentStep = 0;

    function showStep(step) {
      console.log(`Showing step ${step}`);
      wizardCards.forEach((card, index) => {
        // add .active class to the current step
        if (index === step) {
          card.classList.add('active');
          card.style.display = 'block';
        } else {
          card.classList.remove('active');
          card.style.display = 'none';
        }
      });
    }

    // Validation functions
    function validateStep1() {
      const favoriteFoods = document.getElementById('preferred_meal_type').value.trim();
      if (!favoriteFoods) {
        showNotification('Please enter your favorite foods before proceeding.', 'error');
        return false;
      }
      return true;
    }

    function validateStep2() {
      // Check if at least one option is selected in each group
      const requiredGroups = ['preffered_allergy', 'dietary_restrictions', 'preferred_meal_time', 'preferred_drink_type', 'meals_per_day', 'disease'];
      const missingSelections = [];

      requiredGroups.forEach(group => {
        const selected = document.querySelector(`input[name="${group}"]:checked`);
        if (!selected) {
          const legend = document.querySelector(`fieldset:has(input[name="${group}"]) legend`);
          if (legend) {
            missingSelections.push(legend.textContent);
          } else {
            missingSelections.push(group); // Fallback if legend not found
          }
        }
      });

      if (missingSelections.length > 0) {
        showNotification(`Please make selections for the following required fields:\n- ${missingSelections.join('\n- ')}`, 'error');
        return false;
      }

      return true;
    }

    // Show notification function (more user-friendly than alert)
    function showNotification(message, type = 'info') {
      // Check if notification container exists, if not create it
      let notificationContainer = document.getElementById('notification-container');
      if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        document.body.appendChild(notificationContainer);
      }

      // Create notification element
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.innerHTML = `
        <div class="notification-content">
          <p>${message}</p>
          <button class="close-btn">&times;</button>
        </div>
      `;

      // Add notification to container
      notificationContainer.appendChild(notification);

      // Add close handler
      notification.querySelector('.close-btn').addEventListener('click', function () {
        notificationContainer.removeChild(notification);
      });

      // Auto remove after 5 seconds
      setTimeout(() => {
        if (notification.parentNode === notificationContainer) {
          notificationContainer.removeChild(notification);
        }
      }, 5000);
    }

    // Get selected radio button values
    const getAllergy = () => {
      const selected = document.querySelector('input[name="preffered_allergy"]:checked');
      return selected ? selected.value : null;
    };

    const getdietary_restriction = () => {
      const selected = document.querySelector('input[name="dietary_restriction"]:checked');
      return selected ? selected.value : null;
    };

    const getMealTime = () => {
      const selected = document.querySelector('input[name="preferred_meal_time"]:checked');
      return selected ? selected.value : null;
    };

    const getpreferred_drink_type = () => {
      const selected = document.querySelector('input[name="preferred_drink_type"]:checked');
      return selected ? selected.value : null;
    };

    const getMealsPerDay = () => {
      const selected = document.querySelector('input[name="meals_per_day"]:checked');
      return selected ? selected.value : null;
    };

    const getDisease = () => {
      const selected = document.querySelector('input[name="disease"]:checked');
      return selected ? selected.value : null;
    };

    // Single event listener for all button clicks
    document.addEventListener('click', async function (e) {
      // Next button
      if (e.target.classList.contains('btn-primary') &&
        e.target.classList.contains('next-btn')) {

        // Validate step 1 before proceeding
        if (currentStep === 0) {
          if (!validateStep1()) {
            return; // Stop if validation fails
          } else {
            showNotification('Great! Moving to the next step.', 'success');
          }
        }

        if (currentStep < wizardCards.length - 1) {
          currentStep++;
          showStep(currentStep);
        }
      }

      // Back button
      if (e.target.classList.contains('btn-secondary') &&
        e.target.classList.contains('back-btn')) {
        if (currentStep > 0) {
          currentStep--;
          showStep(currentStep);
        }
      }

      // Save Preferences button
      if (e.target.classList.contains('btn-primary') &&
        e.target.classList.contains('save-btn')) {
        // Validate before submission
        if (!validateStep2()) {
          return; // Stop if validation fails
        }

        // Collect all form data
        const favoriteFoods = document.getElementById('preferred_meal_type').value;

        // Create data object
        const preferencesData = {
          preferred_meal_type: favoriteFoods,
          preffered_allergy: getAllergy(),
          dietary_restrictions: getdietary_restriction(),
          preferred_meal_time: getMealTime(),
          preferred_drink_type: getpreferred_drink_type(),
          meals_per_day: parseInt(getMealsPerDay(), 10),
          disease: getDisease()
        };

        try {
          // Show loading state
          e.target.textContent = 'Saving...';
          e.target.disabled = true;

          // Send data to backend - use form submission instead of fetch API to avoid CORS issues
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = '/process_preference';

          // Add form fields
          for (const key in preferencesData) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = preferencesData[key];
            form.appendChild(input);
          }

          // Submit form
          document.body.appendChild(form);
          form.submit();

        } catch (error) {
          showNotification('An error occurred. Please try again.', 'error');
          console.error('Error:', error);

          // Reset button state
          e.target.textContent = 'Save Preferences';
          e.target.disabled = false;
        }
      }
    });

    async function loadUserPreferences() {
      try {
        const response = await fetch('/dashboard/preference');
        
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check if preferences exist
        if (!data.preference) {
          console.log('No preferences found');
          return;
        }
        
        // Access the nested preference data
        const preferences = data.preference;
        
        // Update UI with preferences data
        document.getElementById('dietary_restriction-type-display').textContent = preferences.dietary_restriction || 'Not set';
        document.getElementById('food-allergies-display').textContent = preferences.preffered_allergy || 'None';
        document.getElementById('meal-times-display').textContent = preferences.preferred_meal_time || 'Not set';
        // ... and so on
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    }

    // Add this helper function if it doesn't exist
    function setRadioValue(name, value) {
        if (!value) return;
        const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
        if (radio) radio.checked = true;
    }
