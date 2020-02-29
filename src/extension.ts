/*---------------------------------------------------------
 * Boilerplate Copyright (C) Microsoft Corporation. All rights reserved.
 * Teverse Support by Sasial-roblox, MIT Lisence
 *--------------------------------------------------------*/

import * as vscode from 'vscode';
import fetch from 'node-fetch'
export async function activate(context: vscode.ExtensionContext) {
	let json:any // Required, won't work if I put as JSON. :/
	fetch(`https://raw.githubusercontent.com/teverse/teverse/master/apiDump.json`).then(async res => {
		const converted = await res.json()
		json = converted
		setInterval(async function () {
			const res = await fetch(`https://raw.githubusercontent.com/teverse/teverse/master/apiDump.json`)
			const converted = await res.json()
			json = converted
		}, 3600000)
	}).catch(() => {
		vscode.window.showErrorMessage('Unable to fetch data. Make sure you are connected to the internet and then reload this window.')
		json = require("./../0.16.0.apidump.json")
	})

	const provider1 = vscode.languages.registerCompletionItemProvider(
		'tevlua', {
			provideCompletionItems() {
				let enums: any[] = []
				const getenums = async () => {
					try {
						let keys = Object.keys(json.enums);
						const snippetCompletion = new vscode.CompletionItem('enum');
						snippetCompletion.insertText = new vscode.SnippetString('enum.${1|' + keys.join(",") + '|}');
						snippetCompletion.documentation = new vscode.MarkdownString(`Select an enum`);
						enums.push(snippetCompletion)
						return enums
					} catch (error) {
						console.log(error);
						return undefined
					}
				}
				return getenums()
			}
		}
	);

	const provider2 = vscode.languages.registerCompletionItemProvider(
		'tevlua', {
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

				// get all text until the `position` and check if it reads `console.`
				// and if so then complete if `log`, `warn`, and `error`
				let linePrefix = document.lineAt(position).text.substr(0, position.character);
				let larg = linePrefix.split(".")
				if (!linePrefix.match("enum\..*\.")) {
					return undefined;
				}
				if (larg[2]){
					return undefined
				}
				let arg = larg[1]
				let enums: any[] = []
				const getenums = async () => {
					try {
						let keys = Object.keys(json.enums);
						let i: any = 0
						let ii: any = 0 // Number errors here. :/
						for (ii = 0; ii < keys.length; ii++) {
							if (keys[ii] == arg) {
								let temp = [];
								let key2 = Object.keys(json.enums[keys[ii]]);
								for (i = 0; i < key2.length; i++) {
									const snippetCompletion = new vscode.CompletionItem(key2[i])
									snippetCompletion.insertText = new vscode.SnippetString(key2[i]);
									snippetCompletion.documentation = new vscode.MarkdownString(`Select an enum`);
									enums.push(snippetCompletion)
								}
							}
						}
						return enums
					} catch (error) {
						console.log(error);
						return undefined
					}
				}
				return getenums()
			},
		},
		"."
	);
	const providertest2 = vscode.languages.registerCompletionItemProvider(
		'tevlua', {
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				var i0: any
				var datatypes: any[] = []
				for (i0 = 0;i0<json.classes.length;i0++){
					datatypes.push(json.classes[i0].class)
				}
				require("./../syntaxes/tevlua.tmLanguage.json").patterns.push({
					"name": "constant.class.tevlua",
					"match": "\\b("+
					datatypes.join("|")
					+")\\b"
				})
				return datatypes
			}
		}
	)
	const providertest = vscode.languages.registerCompletionItemProvider(
		'tevlua', {
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

				// get all text until the `position` and check if it reads `console.`
				// and if so then complete if `log`, `warn`, and `error`
				let i: any
				let ii: any
				let iii: any
				let linePrefix = document.lineAt(position).text.substr(0, position.character);
				let larg = linePrefix.split(".")
				let arg = larg[0]
				let fillin: any[] = []
				const getfill = async () => {
					try {
						for (i = 0; i < json.classes.length; i++) {
							if (json.classes[i].class == arg) {
								var mkeys = Object.keys(json.classes[i].methods)
								for (ii = 0; ii < mkeys.length; ii++) {
									const snippetCompletion = new vscode.CompletionItem(mkeys[ii])
									snippetCompletion.insertText = new vscode.SnippetString(mkeys[ii]+"()");
									snippetCompletion.documentation = new vscode.MarkdownString(json.classes[i].methods[mkeys[ii]].desc);
									fillin.push(snippetCompletion)
								}
								var pkeys = Object.keys(json.classes[i].properties)
								for (ii = 0; ii < pkeys.length; ii++) {
									const snippetCompletion = new vscode.CompletionItem(pkeys[ii])
									snippetCompletion.insertText = new vscode.SnippetString(pkeys[ii]);
									snippetCompletion.documentation = new vscode.MarkdownString(json.classes[i].properties[pkeys[ii]].desc);
									fillin.push(snippetCompletion)
								}
							}
						}
						return fillin
					} catch (error) {
						console.log(error);
						return undefined
					}
				}
				return getfill()
			},
		},
		"."
	);

	context.subscriptions.push(provider1, provider2, providertest, providertest2);
	
	vscode.window.showInformationMessage('Intellisense Enabled.');
}