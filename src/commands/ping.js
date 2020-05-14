const vscode = require('vscode');

module.exports = {
    command: function() {
        let context = vscode.commands.registerCommand('teverse.ping', function() {
            vscode.window.showInformationMessage('Pong');
        });
        return context
    }
}





/*
export default class Command {
    method() {
        let command = vscode.commands.registerCommand('teverse.ping', function () {
            vscode.window.showInformationMessage('Pong');
        });
        return command;
    }
}
*/




/*
const vscode = require('vscode');
const axios = require('axios');

function activate(context) {
	console.log('Teverse-vsc-extension is loaded');
	let disposable = vscode.commands.registerCommand('teverse.ping', function () {
		vscode.window.showInformationMessage('Pong');
	});

	context.subscriptions.push(disposable);
}

exports.activate = activate;

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
*/