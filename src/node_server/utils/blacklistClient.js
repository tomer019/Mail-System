const net = require("net");


function checkUrlBlacklist(url) {
  return new Promise((resolve, reject) => {
    console.log("[BlacklistClient] Connecting to TCP server...");

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
// add to map in memory every url that is added to blacklist
const blacklist = new Map(); // id -> url
let nextId = 1;

function addUrlToBlacklist(url) {
  // check if URL already exists
  for (const [id, savedUrl] of blacklist.entries()) {
    if (savedUrl === url) {
      //return Promise.resolve({ id, url }); // prevent duplicates
      return resolve({ status: 200, alreadyExists: true, id, url });
    }
  }

  return new Promise((resolve, reject) => {
    const client = net.createConnection({ host: "blacklist-server", port: 5555 }, () => {
      client.write(`POST ${url}\n`);
      client.end();
    });


    let buffer = "";
    client.setEncoding("utf8");

    client.on("data", (data) => { buffer += data; });

    client.on("end", () => {
      if (buffer.includes("201 Created")) {
        const id = nextId++;
        blacklist.set(id, url);
        resolve({ id, url });
      } else {
        reject(new Error(`Unexpected response: ${buffer.trim()}`));
      }
    });

    client.on("error", reject);
  });
}

function deleteUrlFromBlacklist(id) {
  return new Promise((resolve, reject) => {
    if (!blacklist.has(id)) {
      return resolve({ status: 404 }); // id doesn't exist
    }
    const url = blacklist.get(id);
    if (!url) {
      return resolve({ status: 404 }); // id doesn't exist
    }

    const client = net.createConnection({ host: "blacklist-server", port: 5555 }, () => {
      client.write(`DELETE ${url}\n`);
      client.end();
    });

    let buffer = "";
    client.setEncoding("utf8");

    console.log("Removing URL from blacklist:", url);

    client.on("data", (data) => { buffer += data; });
    client.on("end", () => {
      const response = buffer.trim();
      console.log("📡 TCP response:", response); // debug log
      if (response.includes("204")) {
        blacklist.delete(id) // remove from in-memory map
        return resolve({ status: 204 });
      }
      if (response.includes("404")) return resolve({ status: 404 });
      reject(new Error(`Unexpected response: '${response}'`));
    });

    client.on("error", reject);
  });
}


module.exports = {
  checkUrlBlacklist,
  addUrlToBlacklist,
  deleteUrlFromBlacklist,
};
