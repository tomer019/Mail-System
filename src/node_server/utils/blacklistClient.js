const net = require("net");


function checkUrlBlacklist(url) {
  return new Promise((resolve, reject) => {
    console.log("[BlacklistClient] Connecting to TCP server...");
    // change to "localhost" if you want to run with terminal instead of docker
    const client = net.createConnection({ host: "blacklist-server", port: 5555 }, () => {
      client.write(`GET ${url}\n`);
    });

    let buffer = "";
    client.setEncoding("utf8");

    client.on("data", (data) => {
      buffer += data;
      const lines = buffer.trim().split("\n").map(line => line.trim()).filter(line => line !== "");

      console.log("[BlacklistClient] Accumulated lines:", lines);

      if (lines.length >= 2) {
        const statusLine = lines[0];
        const resultLine = lines[1];

        if (statusLine !== "200 OK") {
          client.end();
          return reject(new Error(`Unexpected status from blacklist server: ${statusLine}`));
        }

        // block only if result is "true true"
        const isBlacklisted = resultLine === "true true";

        console.log("[BlacklistClient] result line:", resultLine);
        console.log("[BlacklistClient] isBlacklisted =", isBlacklisted);

        resolve(isBlacklisted);
        client.end();
      }
    });

    client.on("error", (err) => {
      console.error("[BlacklistClient] Connection error:", err);
      reject(err);
    });
  });
}

async function addUrlToBlacklist(url) { // became async by Meir in exercise 4
  return new Promise((resolve, reject) => {
    // change to "localhost" if you want to run with terminal instead of docker
    const client = net.createConnection({ host: "blacklist-server", port: 5555 }, () => {
      client.write(`POST ${url}\n`);
    });

    let buffer = "";
    client.setEncoding("utf8");

    client.on("data", (data) => { buffer += data; });
    client.on("end", () => {
      if (buffer.trim() === "201 Created") {
        resolve();
      } else {
        reject(new Error(`Unexpected response: ${buffer.trim()}`));
      }
    });

    client.on("error", reject);
  });
}

function deleteUrlFromBlacklist(url) {
  return new Promise((resolve, reject) => {
// change to "localhost" if you want to run with terminal instead of docker
    const client = net.createConnection({ host: "blacklist-server", port: 5555 }, () => {
      client.write(`DELETE ${url}\n`);
    });

    let buffer = "";
    client.setEncoding("utf8");

    client.on("data", (data) => { buffer += data; });
    client.on("end", () => {
      const response = buffer.trim();
      if (response === "204 No Content") return resolve({ status: 204 });
      if (response === "404 Not Found") return resolve({ status: 404 });
      reject(new Error(`Unexpected response: ${response}`));
    });

    client.on("error", reject);
  });
}

module.exports = {
  checkUrlBlacklist,
  addUrlToBlacklist,
  deleteUrlFromBlacklist,
};
