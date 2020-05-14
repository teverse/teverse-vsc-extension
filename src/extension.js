const path = require('path');
const fs = require('fs');
const vscode = require('vscode');
const axios = require('axios').default;

let directory = {}; // Holds structured build from documentation

function activate(context) {
	console.log('Teverse-vsc-extension is loaded');
	
	// Fetch API Documentation & build base provider format (intellisense)
	axios.get('https://raw.githubusercontent.com/teverse/teverse/master/api.json')
		.then(function(response) {
			const data = response.data;
			vscode.window.showInformationMessage('Teverse: Latest API Documentation fetched ('+(data["version"])+')');

			// Build Providers from API
			for(var key in data["sandbox"]) {
				if(typeof(data["sandbox"][key]) == "object") {
					directory[key] = []
					for(var value in data["sandbox"][key]) {
						directory[key].push(new vscode.CompletionItem(value, 2));
					}
				} 
			}

			// Register Classes
			let classes = Object.keys(directory);
			let provider1 = vscode.languages.registerCompletionItemProvider('lua', {
				provideCompletionItems(document) {
					let temp = [];
					classes.forEach(element => {
						if(document.getText().match(new RegExp('^[a-zA-Z].'))) {
							return undefined;
						}
						temp.push(new vscode.CompletionItem(element, 6));
					});
					return temp;
				}
			}, '.');

			// Register Children instances based on Registered classes above
			let provider2 = vscode.languages.registerCompletionItemProvider('lua', {
				provideCompletionItems(document) {
					let temp = [];
					for(var key in directory) {
						directory[key].forEach(element => {
							if(!document.getText().match(new RegExp('^'+key+'.'))) {
								return undefined;
							}
							temp.push(element);
						});
					}
					return temp;
				}
			}, '.');

			context.subscriptions.push(provider1, provider2);
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