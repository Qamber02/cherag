const API_KEY = "PASTE_YOUR_GEMINI_API_KEY_HERE";

fetch(`https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`)
  .then(res => res.json())
  .then(data => {
    console.log("Available Gemini models:");
    data.models.forEach(model => {
      console.log("-", model.name);
    });
  })
  .catch(err => console.error(err));
