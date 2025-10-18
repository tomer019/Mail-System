const app = require("./app");
const PORT = process.env.PORT || 3000;

// Starts the server and listens on the defined port
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});