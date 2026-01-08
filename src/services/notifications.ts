
export const NotificationsService = {
  testPushover: async (user: string, token: string): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('user', user);
      formData.append('message', 'Test de notification MG Tools');
      formData.append('title', 'MG Tools');

      const response = await fetch('https://api.pushover.net/1/messages.json', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      return data.status === 1;
    } catch (e) {
      console.error('Pushover test failed', e);
      return false;
    }
  },

  testDiscord: async (webhookUrl: string): Promise<boolean> => {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: "Test de notification MG Tools",
          username: "MG Tools"
        })
      });
      return response.ok;
    } catch (e) {
      console.error('Discord webhook test failed', e);
      return false;
    }
  },

  sendNotification: async (title: string, message: string) => {
    const pushoverUser = await window.electronAPI.getCredentials('pushover_user');
    const pushoverToken = await window.electronAPI.getCredentials('pushover_token');
    const discordWebhook = await window.electronAPI.getCredentials('discord_webhook');

    // Pushover
    if (pushoverUser && pushoverToken) {
        try {
            const formData = new FormData();
            formData.append('token', pushoverToken);
            formData.append('user', pushoverUser);
            formData.append('message', message);
            formData.append('title', title);
            fetch('https://api.pushover.net/1/messages.json', { method: 'POST', body: formData }).catch(console.error);
        } catch (e) { console.error(e); }
    }

    // Discord
    if (discordWebhook) {
        try {
            fetch(discordWebhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: title,
                        description: message,
                        color: 0x00ff00, // Green
                        footer: { text: 'MG Tools' },
                        timestamp: new Date().toISOString()
                    }]
                })
            }).catch(console.error);
        } catch (e) { console.error(e); }
    }
  }
};
