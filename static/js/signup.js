document.addEventListener("DOMContentLoaded", function () {
      const form = document.getElementById("signup-form");
      if (!form) return;

      form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const first_name = form.elements['first_name'].value;
        const last_name = form.elements['last_name'].value;
        const email = form.elements['email'].value;
        const user_password = form.elements['user_password'].value;
        const gender = form.elements['gender'].value;
        const date_of_birth = new Date(document.getElementById('date_of_birth').value).toISOString().split('T')[0];

        try {
          const response = await fetch('/auth/signup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              first_name: first_name,
              last_name: last_name,
              email: email,
              user_password: user_password,
              gender: gender,
              date_of_birth: date_of_birth
            })
          });

          if (response.ok) {
            // Redirect or show success message
            window.location.href = '/login';
          } else {
            // Handle error (e.g., show error message)
            alert('Registration failed. Please check your details.');
          }
        } catch (error) {
          alert('An error occurred. Please try again.');
        }
      });
    });