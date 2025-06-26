// Nutrition calculations and database functions

// Database functions using localStorage
const DB = {
    // Save a food item to the database
    saveFood: function(foodItem) {
        const storedFoods = this.getAllFoods();
        storedFoods.push({
            ...foodItem,
            timestamp: new Date().toISOString(),
            id: Date.now().toString()
        });
        localStorage.setItem('foodItems', JSON.stringify(storedFoods));
    },
    
    // Get all stored food items
    getAllFoods: function() {
        const storedFoods = localStorage.getItem('foodItems');
        return storedFoods ? JSON.parse(storedFoods) : [];
    },
    
    // Delete a food item by ID
    deleteFood: function(id) {
        const storedFoods = this.getAllFoods();
        const updatedFoods = storedFoods.filter(item => item.id !== id);
        localStorage.setItem('foodItems', JSON.stringify(updatedFoods));
    },
    
    // Get food items within a date range
    getFoodsInRange: function(startDate, endDate) {
        const storedFoods = this.getAllFoods();
        return storedFoods.filter(item => {
            const itemDate = new Date(item.timestamp);
            return itemDate >= startDate && itemDate <= endDate;
        });
    }
};

// Calculate daily nutrition totals
function calculateDailyTotals(foodItems) {
    return foodItems.reduce((totals, item) => {
        return {
            calories: totals.calories + (item.nf_calories || 0),
            protein: totals.protein + (item.nf_protein || 0),
            carbs: totals.carbs + (item.nf_total_carbohydrate || 0),
            fat: totals.fat + (item.nf_total_fat || 0),
            fiber: totals.fiber + (item.nf_dietary_fiber || 0),
            sugar: totals.sugar + (item.nf_sugars || 0)
        };
    }, {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0
    });
}

// Group foods by day
function groupFoodsByDay(foodItems) {
    const days = {};
    
    foodItems.forEach(item => {
        const date = new Date(item.timestamp);
        const dateStr = date.toISOString().split('T')[0];
        
        if (!days[dateStr]) {
            days[dateStr] = [];
        }
        days[dateStr].push(item);
    });
    
    return days;
}

// Calculate daily totals for each day
function calculateAllDailyTotals(foodsByDay) {
    const dailyTotals = {};
    
    for (const [date, foods] of Object.entries(foodsByDay)) {
        dailyTotals[date] = calculateDailyTotals(foods);
    }
    
    return dailyTotals;
}

// Calculate weekly averages
function calculateAverages(dailyTotals) {
    const days = Object.keys(dailyTotals);
    const totalDays = days.length;
    
    if (totalDays === 0) return null;
    
    return days.reduce((avg, day) => {
        const daily = dailyTotals[day];
        return {
            calories: avg.calories + (daily.calories / totalDays),
            protein: avg.protein + (daily.protein / totalDays),
            carbs: avg.carbs + (daily.carbs / totalDays),
            fat: avg.fat + (daily.fat / totalDays),
            fiber: avg.fiber + (daily.fiber / totalDays),
            sugar: avg.sugar + (daily.sugar / totalDays)
        };
    }, {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0
    });
}

// Calculate macro percentages
function calculateMacroPercentages(nutritionTotals) {
    const proteinCalories = nutritionTotals.protein * 4;
    const carbsCalories = nutritionTotals.carbs * 4;
    const fatCalories = nutritionTotals.fat * 9;
    const totalCalories = proteinCalories + carbsCalories + fatCalories;
    
    if (totalCalories === 0) return { protein: 0, carbs: 0, fat: 0 };
    
    return {
        protein: Math.round((proteinCalories * 100) / totalCalories),
        carbs: Math.round((carbsCalories * 100) / totalCalories),
        fat: Math.round((fatCalories * 100) / totalCalories)
    };
}

// Get nutrition data for a specific time interval
function getNutritionDataForInterval(interval) {
    const endDate = new Date();
    let startDate = new Date();
    
    switch (interval) {
        case 'day':
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'week':
            startDate.setDate(endDate.getDate() - 7);
            break;
        case 'month':
            startDate.setMonth(endDate.getMonth() - 1);
            break;
        default:
            startDate.setDate(endDate.getDate() - 7); // Default to week
    }
    
    const foodsInRange = DB.getFoodsInRange(startDate, endDate);
    const foodsByDay = groupFoodsByDay(foodsInRange);
    const dailyTotals = calculateAllDailyTotals(foodsByDay);
    const averages = calculateAverages(dailyTotals);
    const macroPercentages = averages ? calculateMacroPercentages(averages) : { protein: 0, carbs: 0, fat: 0 };
    
    // Get dates sorted
    const dates = Object.keys(dailyTotals).sort();
    
    // Prepare trend data for charts
    const trendData = {
        dates: dates,
        calories: dates.map(date => dailyTotals[date].calories),
        protein: dates.map(date => dailyTotals[date].protein),
        carbs: dates.map(date => dailyTotals[date].carbs),
        fat: dates.map(date => dailyTotals[date].fat)
    };
    
    return {
        foodItems: foodsInRange,
        dailyTotals,
        averages,
        macroPercentages,
        trendData
    };
}

// Chart rendering functions

let caloriesChart = null;
let macrosChart = null;
let trendsChart = null;

// Initialize charts
function initCharts() {
    // Calories chart (line chart)
    const caloriesCtx = document.getElementById('caloriesChart').getContext('2d');
    caloriesChart = new Chart(caloriesCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Calories',
                data: [],
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Calories'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });
    
    // Macros chart (pie chart)
    const macrosCtx = document.getElementById('macrosChart').getContext('2d');
    macrosChart = new Chart(macrosCtx, {
        type: 'pie',
        data: {
            labels: ['Protein', 'Carbs', 'Fat'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(255, 99, 132, 0.6)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                }
            }
        }
    });
    
    // Trends chart (line chart for macros)
    const trendsCtx = document.getElementById('trendsChart').getContext('2d');
    trendsChart = new Chart(trendsCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Protein (g)',
                    data: [],
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    tension: 0.1
                },
                {
                    label: 'Carbs (g)',
                    data: [],
                    borderColor: 'rgb(255, 206, 86)',
                    backgroundColor: 'rgba(255, 206, 86, 0.1)',
                    tension: 0.1
                },
                {
                    label: 'Fat (g)',
                    data: [],
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Grams'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });
}

// Update charts with new data
function updateCharts(nutritionData) {
    const { trendData, macroPercentages } = nutritionData;
    
    // Format dates for display
    const formattedDates = trendData.dates.map(dateStr => {
        const date = new Date(dateStr);
        return date.toLocaleDateString();
    });
    
    // Update calories chart
    caloriesChart.data.labels = formattedDates;
    caloriesChart.data.datasets[0].data = trendData.calories;
    caloriesChart.update();
    
    // Update macros chart
    macrosChart.data.datasets[0].data = [
        macroPercentages.protein,
        macroPercentages.carbs,
        macroPercentages.fat
    ];
    macrosChart.update();
    
    // Update trends chart
    trendsChart.data.labels = formattedDates;
    trendsChart.data.datasets[0].data = trendData.protein;
    trendsChart.data.datasets[1].data = trendData.carbs;
    trendsChart.data.datasets[2].data = trendData.fat;
    trendsChart.update();
}