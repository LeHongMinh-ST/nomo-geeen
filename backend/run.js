#!/usr/bin/env node
// Wrapper: doc .env, set env vars, exec NestJS compiled.
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
	for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
		const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
		if (m && !process.env[m[1]]) {
			process.env[m[1]] = m[2];
		}
	}
}
process.chdir(__dirname);
require("./dist/src/main.js");
