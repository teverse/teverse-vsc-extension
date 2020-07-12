const path = require('path');
const fs = require('fs');
const vscode = require('vscode');
const axios = require('axios').default;

let singletons = {}; // Holds structured build from documentation
let constructable = [];
let data = {};

function findClosingParen(text, openPos) {
    let closePos = openPos;
    let counter = 1;
    while (counter > 0 && text.length > closePos) {
        let c = text[++closePos];
        if (c == '(') {
            counter++;
        }
        else if (c == ')') {
            counter--;
        }
	}
	
	if (counter != 0)
		return null;

    return closePos;
}

function getAllProperties(className){
	let properties = {}
	Object.assign(properties, data["classes"][className].properties);
	if (data["classes"][className].extends){
		let inherited = getAllProperties(data["classes"][className].extends);
		Object.assign(properties, inherited);
	}
	return properties;
}

function getAllMethods(className){
	let methods = {}
	Object.assign(methods, data["classes"][className].methods);
	if (data["classes"][className].extends){
		let inherited = getAllMethods(data["classes"][className].extends);
		Object.assign(methods, inherited);
	}
	return methods;
}

function getAllEvents(className){
	let events = {};
	Object.assign(events, data["classes"][className].events);
	if (data["classes"][className].extends){
		let inherited = getAllEvents(data["classes"][className].extends);
		Object.assign(events, inherited);
	}
	return events;
}

function sampleData(type, name, start = 1){
	switch (type){
		case "boolean":
			return {string: "${" + start + "|true,false|}", parameters: 1};
		case "vector2":
			return {string: "vector2(${" + start + ":0}, ${" + (start+1) + ":0})", parameters: 2};
		case "vector3":
			return {string: "vector3(${" + start + ":0}, ${" + (start+1) + ":0}, ${" + (start+2) + ":0})", parameters: 3};
		case "colour":
			return {string: "colour.rgb(${" + start + ":255}, ${" + (start+1) + ":255}, ${" + (start+2) + ":255})", parameters: 3};
		case "quaternion":
			return {string: "quaternion(${" + start + ":0}, ${" + (start+1) + ":0}, ${" + (start+2) + ":0}, ${" + (start+3) + "1})", parameters: 4};
		case "guiCoord":
			return {string: "guiCoord(${" + start + ":0.0}, ${" + (start+1) + ":0}, ${" + (start+2) + ":0.0}, ${" + (start+3) + ":0})", parameters: 4};
		case "function":
			if (name == "?callback")
				return {string: "function(status, body)\n\t${" + (start+1) + ":-- on http result}\nend", parameters: 2};
			return {string: "function(${" + start + "})\n\t${" + (start+1) + ":-- function body}\nend", parameters: 2};
		case "string":
			return {string: "\"${" + start + ":" + name + "}\"", parameters: 1};
		case "...":
			return {string: "${" + start + ":...}", parameters: 1};
		case "number":
			return {string: "${" + start + ":0}", parameters: 1};
		default:
			if (name == "?headers")
				return {string: "${" + start + ":{[\"Example-Header\"] = \"\"}}", parameters: 1};
			return {string: "${" + start + ":" + name + "}", parameters: 1};
	}
}

function sampleParameters(parameters){
	let paramArray = [];
	let start = 1;
	for (var key in parameters){
		let param = sampleData(parameters[key].type, parameters[key].name, start);
		start += param.parameters;
		paramArray.push(param.string);
	}
	return paramArray.join(", ");
}

function activate(context) {
	console.log('Teverse-vsc-extension is loaded');
	
	// Fetch API Documentation & build base provider format (intellisense)
	axios.get('https://raw.githubusercontent.com/teverse/teverse/master/api.json')
		.then(function(response) {
			data = response.data;
			vscode.window.showInformationMessage('Teverse: Latest API Documentation fetched ('+(data["version"])+')');

			// Build Providers from API
			for(var key in data["sandbox"]) {
				if(typeof(data["sandbox"][key]) == "object") {
					singletons[key] = []
					for(var value in data["sandbox"][key]) {
						if (value != "construct"){
							let item = new vscode.CompletionItem(value, vscode.CompletionItemKind.Function);
							item.commitCharacters = ["."];
							singletons[key].push(item);
						}
					}
				} 
			}

			for(var key in data["classes"]) {
				if(data["classes"][key].constructable) {
					constructable.push(key);
				} 
			}
			
			// construct currently not documented as it is a stray function
			let constructItem = new vscode.CompletionItem("construct", vscode.CompletionItemKind.Function);
			constructItem.insertText = new vscode.SnippetString("construct(\"${1|" + constructable.join(",") + "|}\", {${2: }})"); 

			singletons.teverse.push(constructItem);

			// Register Classes
			let classes = Object.keys(singletons);
			let provider1 = vscode.languages.registerCompletionItemProvider('lua', {
				/**
				 * @param {vscode.TextDocument} document
				 */
				provideCompletionItems(document) {
					let temp = [];
					classes.forEach(element => {
						if(document.getText().match(new RegExp('^[a-zA-Z].'))) {
							return undefined;
						}
						temp.push(new vscode.CompletionItem(element, vscode.CompletionItemKind.Class));
					});
					return temp;
				}
			}, '.');

			// Register Children instances based on Registered classes above
			let provider2 = vscode.languages.registerCompletionItemProvider('lua', {
				/**
				 * @param {vscode.TextDocument} document
				 * @param {vscode.Position} position
				 */
				provideCompletionItems(document, position) {
					let temp = [];

					var textToMatch = document.lineAt(position.line).text.substring(0, position.character);

					let lastSpace = textToMatch.lastIndexOf(" ");
					if (lastSpace == -1)
						lastSpace = 0;
					else
						lastSpace++;

					let splitted = textToMatch.substr(lastSpace).split(".");
					let root = singletons[splitted[0]];
					if (splitted.length <= 2){
						root.forEach(element => {
							temp.push(element);
						});
					}
					else{
						let singletonName = splitted[1];
						if (data.classes[singletonName]){
							let properties = getAllProperties(singletonName);
							for (var key in properties){
								let item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Property);
								item.detail = (properties[key].hasSetter === true ? "" : "[READ-ONLY] ") + properties[key].type + " | " + properties[key].description;
								temp.push(item);
							}
						}
					}

					return temp;
				}
			}, '.');

			// Register construct properties
			let provider3 = vscode.languages.registerCompletionItemProvider('lua', {
				/**
				 * @param {vscode.TextDocument} document
				 * @param {vscode.Position} position
				 */
				provideCompletionItems(document, position) {
					let temp = [];

					var textBeforePos = document.getText(new vscode.Range(new vscode.Position(0, 0), position));

					var constructIndex = textBeforePos.lastIndexOf("teverse.construct(");
					if (constructIndex > -1){
						var classMatch = textBeforePos.substr(constructIndex).match(/"(.*)"/);
						if (classMatch == null){
							for (var key in constructable){
								let item = new vscode.CompletionItem("\"" + constructable[key] + "\"", vscode.CompletionItemKind.Text);
								temp.push(item);
							};
						}
						else {
							var closingPosition = findClosingParen(textBeforePos, constructIndex + 17);
							if (closingPosition == null){
								let className = classMatch[1];
								let classData = data["classes"][className];

								let properties = getAllProperties(className);
								for (var key in properties){
									if (properties[key].hasSetter){
										let item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Property);
										item.insertText = new vscode.SnippetString(key + " = " + sampleData(properties[key].type, properties[key].name).string);
										item.detail = properties[key].type + " | " + properties[key].description;
										temp.push(item);
									}
								}
							}
						}
					}
					return temp;
				}
			}, "\n");

			let provider4 = vscode.languages.registerCompletionItemProvider('lua', {
				/**
				 * @param {vscode.TextDocument} document
				 * @param {vscode.Position} position
				 */
				provideCompletionItems(document, position) {
					let temp = [];

					var textToMatch = document.lineAt(position.line).text.substring(0, position.character);

					let lastSpace = textToMatch.lastIndexOf(" ");
					if (lastSpace == -1)
						lastSpace = 0;
					else
						lastSpace++;

					let splitted = textToMatch.substr(lastSpace).split(".");
					let root = singletons[splitted[0]];
					if (splitted.length == 2){
						let singletonName = splitted[1].split(":")[0];
						if (data.classes[singletonName]){
							let methods = getAllMethods(singletonName);
							for (var key in methods){
								let item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Method);
								item.detail = methods[key].description;
								item.insertText = new vscode.SnippetString(key + "(" + sampleParameters(methods[key].parameters) + ")");
								temp.push(item);
							}

							let events = getAllEvents(singletonName);
							for (var key in events){
								let paramNames = [];
								for (var param in events[key].parameters){
									paramNames.push(events[key].parameters[param].name);
								}

								let item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Event);
								item.detail = events[key].description;
								item.insertText = new vscode.SnippetString("on(\"" +key + "\", function(" + paramNames.join(', ') + ")\n\t${1:-- event listener body}\nend)");
								temp.push(item);
							}
						}
					}

					return temp;
				}
			}, ':');

			context.subscriptions.push(provider1, provider2, provider3, provider4);
		})
		.catch(function(error) {
			vscode.window.showWarningMessage('Teverse: '+error);
		});

	// Register Commands (Command + Shift + p) from commands directory
	var absPath_1 = path.join(__dirname, "commands");
	fs.readdirSync(absPath_1).forEach(function(file) {
		context.subscriptions.push(require('./commands/'+file).command());
	});
}

exports.activate = activate;

function deactivate() {}

module.exports = {
	activate,
	deactivate
}