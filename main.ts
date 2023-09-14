import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, ItemView, WorkspaceLeaf } from 'obsidian';
import { axios } from 'axios'
interface CoPilotChatSettings {
	apiKey: string;
	defaultGreeting: string;
	enableTimestamps: boolean;
	chatTheme: 'light' | 'dark'; 
}

const DEFAULT_SETTINGS: CoPilotChatSettings = {
	apiKey: '',
	defaultGreeting: 'Hello, how can I help you today?',
	enableTimestamps: true,
	chatTheme: 'dark'
};

export default class MyPlugin extends Plugin {
	settings: CoPilotChatSettings;
	activeSidebar: CoPilotSidebar | null = null

	async onload() {
		this.settings = { ...DEFAULT_SETTINGS, ...await this.loadData() };
		this.addSettingTab(new CoPilotSettingTab(this.app, this));
		this.addRibbonIcon('message-circle', 'Open Chat', () => {
			this.toggleSidebar();});
	console.log('Plugin Loaded!');
	}

	toggleSidebar() {
		const leaf = this.app.workspace.getRightLeaf(false);
		if(leaf.view.getViewType() === 'chat-panel') {
			if (this.activeSidebar) {
				this.activeSidebar.saveCurrentSession();
			}
			leaf.setViewState({type: 'empty'});
		} else {
			this.initializeSidebar();
		}}

	initializeSidebar() {
		const leaf = this.app.workspace.getRightLeaf(true);
		leaf.setViewState({
			type: 'chat-panel',
		});
		
		this.activeSidebar = new CoPilotSidebar(this.app, leaf.view.containerEl, this.settings, this);
		
	}

	async onunload() {
		await this.saveData(this.settings);
		console.log('Plugin unloaded!')
}
	
	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class CoPilotSidebar {
	app: App;
	container: HTMLElement;
	messagesDiv: HTMLDivElement;
	inputElement: HTMLInputElement;
	chatHistory: HTMLElement;
	settings: CoPilotChatSettings;
	chatSessions: Array<Array<string>>;
	currentSession: Array<string>;
	sessionDropdown: HTMLSelectElement;
	plugin: MyPlugin;

	constructor (app: App, container: HTMLElement, settings: CoPilotChatSettings, plugin: MyPlugin) {
		this.app = app;
		this.container = container;
		this.settings = settings;
		this.plugin = plugin;
		
		this.chatSessions = []
		this.currentSession = []
		this.sessionDropdown = this.container.createEl('select') as HTMLSelectElement;
		const defaultOption = document.createEl('option');
		defaultOption.value = '-1'
		defaultOption.text = 'Choose Previous Chat Session';
		this.sessionDropdown.appendChild(defaultOption);

		this.sessionDropdown.addEventListener('change', ()=> {
			this.loadChatSession(Number(this.sessionDropdown.value));
		});
		
		
		this.messagesDiv = this.container.createDiv({ cls: 'messages' })
		this.inputElement = this.container.createEl('input', { type: 'text', placeholder: 'Type your message...'}) as HTMLInputElement;
		this.inputElement.addEventListener('keydown', (event: KeyboardEvent) => {
			if (event.code === 'Enter') {
				this.sendMessages(this.inputElement.value);
				this.inputElement.value = '';
			}
		this.chatHistory = this.container.createEl('div', { 'cls': 'chat-history' });	
		});
	}

	async sendMessages(message: string) {
		const userMessageDiv = this.chatHistory.createEl('div', { 'cls': 'user-message' });
		userMessageDiv.setText(`User: ${message}`);
		
		const gptMessage = '';
		
		const apiEndpoint = 'https://api.openai.com/v1/chat/completions'
		const apiKey = this.settings.apiKey

		const headers = {
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		};

		const body = {
			prompt: message,
			max_tokens: 150
		};

		try {
			const response = await axios.post(apiEndpoint, body, { headers: headers });
			if (response && response.data && response.data.choices && response.data.choices.length > 0) {
				const gptMessage = response.data.choices[0].text.trim();

				const gptMessageDiv = this.chatHistory.createEl('div', { 'cls': 'gpt-message' });
				gptMessageDiv.setText(`GPT: ${gptMessage}` );

				this.currentSession.push(`User: ${message}`);
				this.currentSession.push(`GPT: ${gptMessage}`);
			}
		} catch (error) {
			console.error('Error fetching GPT response:', error);

			let errorMessage: string;

			if (error.response) {
				if (error.response.status === 429) {
					errorMessage = 'Error: Rate limit reached. Please try again later.';
				} else if (error.response.status === 403) {
					errorMessage = 'Error: Invalid API key or insufficient permissions.';
				} else if (error.response.status >= 500) {
					errorMessage = 'Error: Server error at OpenAI. Please try again later.';
				} else {
					errorMessage = `Error: ${error.response.data?.error || 'Unexpected Error'}`;
				}
			} else if (error.request) {
				errorMessage = 'Error: No response received. Please check your internet connection.';
			} else {
				errorMessage = `Error: ${error.message}`;
			}

			console.error(errorMessage)

			const errorMessagediv = this.chatHistory.createEl('div', { 'cls': 'error-message' });
			errorMessagediv.setText('Error: Failed to get a response')
		}

		this.currentSession.push(`User: ${message}`);
		this.currentSession.push(`GPT: ${gptMessage}`);
	}
	
	loadChatSession(SelectedIndex: number) {
		if (SelectedIndex >= 0 && SelectedIndex < this.chatSessions.length) {
			const selectedSession = this.chatSessions[SelectedIndex];
			this.chatHistory.innerHTML = '';
			selectedSession.forEach(message => {
				const messageDiv = this.chatHistory.createEl('div');
				messageDiv.textContent = message;
			});
		}
	}

	saveCurrentSession() {
		if (this.currentSession.length) {
			this.chatSessions.push(this.currentSession);

			if (this.chatSessions.length > 5) {
				this.chatSessions.shift();
			}

			this.updateChatSessionDropdown();

			this.currentSession = [];
		}
	}

	updateChatSessionDropdown() {
		while (this.sessionDropdown.options.length > 1) {
			this.sessionDropdown.remove(1);
		}
		this.chatSessions.forEach((session, index) => {
			const option = document.createElement('option');
			option.value = index.toString();
			option.text = `Chat Session ${index + 1}`;
			this.sessionDropdown.appendChild(option);
		})
	}

	applyChatTheme() {
		const theme = this.settings.chatTheme
		if (theme === 'light') {
			this.messagesDiv.classList.add('light');
			this.messagesDiv.classList.remove('dark');
		} else if (theme === 'dark') {
			this.messagesDiv.classList.add('dark');
			this.messagesDiv.classList.remove('light');
		}
	}

}
class CoPilotSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		new Setting(containerEl)
		.setName ('API Key')
		.setDesc('Enter your API Key from openai.com')
		.addText(text => text
			.setPlaceholder('Enter API Key')
			.setValue(this.plugin.settings.apiKey)
			.onChange(async (value) => {
				this.plugin.settings.apiKey = value;
				await this.plugin.saveSettings();
			}));
		
		new Setting(containerEl)
		.setName('Chat Theme')
		.setDesc('Choose the theme for the chat interface.')
		.addDropdown(Dropdown => Dropdown
			.addOption('light', 'Light')
			.addOption('dark', 'Dark')
			.setValue(this.plugin.settings.chatTheme)
			.onChange(async (value) => {
				this.plugin.settings.chatTheme = value as 'light' | 'dark';
				await this.plugin.saveSettings();
			})
		);
		
		new Setting(containerEl)
		.setName('Default Greeting')
		.setDesc('Enter the default greeting message.')
		.addText(text => text
			.setPlaceholder('Enter default greeting')
			.setValue(this.plugin.settings.defaultGreeting)
			.onChange(async (value) => {
				this.plugin.settings.defaultGreeting = value;
				await this.plugin.saveSettings();
			}));

		new Setting(containerEl)
		.setName('Enable Timestamps')
		.setDesc('Toggle to enable or disable timestamps in the chat.')
		.addToggle(toggle => toggle
			.setValue(this.plugin.settings.enableTimestamps)
			.onChange(async (value) => {
				this.plugin.settings.enableTimestamps = value;
				await this.plugin.saveSettings();
			}));
			console.log('Settings Loaded!');
	}
}
