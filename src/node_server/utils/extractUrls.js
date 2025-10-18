function extractUrls(text) {
  const urlRegex = /https?:\/\/[^\s]+/g; // Matches URLs starting with http or https
  return text.match(urlRegex) || [];
}

module.exports = { extractUrls };