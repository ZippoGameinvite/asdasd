const { Client, Collection, Intents, MessageActionRow, MessageButton, MessageEmbed, MessageAttachment } = require('discord.js');
const client = global.client = new Client({	allowedMentions: { parse: ['users', 'roles'], repliedUser: true },
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.MESSAGE_CONTENT, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGES]
 
})

const fs = require('fs');
const settings = require("./ayarlar.json");

client.login(settings.token).catch(err => {console.error("Tokene bağlanılamıyor tokeni yenileyin!")});

client.commands = new Collection();
const { readdirSync } = require("fs");   
const { join } = require("path");

const commandFiles = readdirSync(join(__dirname, "komutlar")).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(join(__dirname, "komutlar", `${file}`));
    client.commands.set(command.code, command)
    console.log('[ '+command.code+' ] adlı komut başarıyla çalışıyor.');
}

client.once("ready", async() => {
  console.log("Bot Başarıyla Aktif Edilmiştir")
});




client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(settings.prefix)) return;

  const args = message.content.slice(settings.prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'ticket') {
    const button = new MessageButton()
      .setCustomId('create_support')
      .setLabel('⚡ Lightning Ticket System')
      .setStyle('PRIMARY')

    const row = new MessageActionRow().addComponents(button);

    const supportChannel = message.guild.channels.cache.get(settings.butonugöndercegiyer);
    if (supportChannel) {
      const supportEmbed = new MessageEmbed()
        .setColor('#00ff00')
        .setTitle('Lightning Free Ticket System')
        .setDescription(`Lightning Tarafından Ücretsiz Yapılmıstır Buraları Değiştirin`)
        .setImage(settings.serverlogosu);

      const supportMessage = await supportChannel.send({ embeds: [supportEmbed], components: [row] });
      await supportMessage.react('⚡');
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'create_support') {
    const user = interaction.user;
    const supportCategory = interaction.guild.channels.cache.get(settings.acilacakkategori);

    if (supportCategory) {
      const channel = await supportCategory.guild.channels.create(`destek-${user.tag}`, {
        type: 'text',
        parent: supportCategory,
        permissionOverwrites: [
          {
            id: user.id,
            allow: ['VIEW_CHANNEL'],
          },
          {
            id: settings.yetkilirolID,
            allow: ['VIEW_CHANNEL'],
          },
          {
            id: interaction.guild.roles.everyone,
            deny: ['VIEW_CHANNEL'],
          },
        ],
      });

      const addActionRow = new MessageActionRow()
        .addComponents(
          new MessageButton()
            .setCustomId('add_user')
            .setLabel('➕ Kullanıcı Ekle')
            .setStyle('PRIMARY'),
          new MessageButton()
            .setCustomId('remove_user')
            .setLabel('➖ Kullanıcı Çıkar')
            .setStyle('DANGER'),
          new MessageButton()
            .setCustomId('close_support')
            .setLabel('🗑️ Destek Kapat')
            .setStyle('SECONDARY')
        );

        const supportEmbed = new MessageEmbed()
        .setColor('#00ff00')
        .setTitle('Destek Talebi')
        .setDescription(`Destek Açan Kişi: ${user}\nLightning Tarafından Ücretsiz Yapılmıstır Özel Alt Yapı Satın Almak İsterseniz Discord: lightningx001`)
        .setImage(settings.serverlogosu);
  
      await channel.send({ embeds: [supportEmbed], components: [addActionRow] });
    }
  }

  const conversationStorage = new Map();

  if (interaction.customId === 'close_support') {
    const logChannel = interaction.guild.channels.cache.get(settings.logChannelID);
    const closer = interaction.user.tag;
    const closeTime = new Date().toLocaleString();
    const closeReason = 'Kullanıcı tarafından kapatıldı';
    const channelMessages = await interaction.channel.messages.fetch({ limit: 100 });
    const messagesContent = channelMessages.map(msg => `${msg.author.tag}: ${msg.content}`).reverse().join('\n');
    const attachment = new MessageAttachment(Buffer.from(messagesContent), 'talep-konuşma.txt');

    const logEmbed = new MessageEmbed()
      .setColor('#ff0000')
      .setTitle('Destek Talebi Kapatıldı')
      .setDescription(`Kapatma Zamanı: ${closeTime}\nKapatan Kişi: ${closer}\nKapatma Sebebi: ${closeReason}`)

    logChannel.send({ embeds: [logEmbed], files: [attachment] });
    await interaction.channel.delete();
  }

  if (interaction.customId === 'add_user') {
    const filter = response => {
      return response.author.id === interaction.user.id;
    };
  
    await interaction.deferReply();
  
    try {
      await interaction.followUp({
        content: 'Eklemek istediğiniz kullanıcının kimliğini (ID) girin:',
        ephemeral: true
      });
  
      const userResponse = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
      const userID = userResponse.first().content;
  
      const targetMember = interaction.guild.members.cache.get(userID);
      if (!targetMember) {
        await interaction.followUp('Belirtilen kimlikle bir kullanıcı bulunamadı.');
        return;
      }
        const memberToAdd = interaction.guild.members.cache.get(targetMember.id);
        const channel = interaction.channel;
      await channel.permissionOverwrites.create(memberToAdd, {
        VIEW_CHANNEL: true,
        SEND_MESSAGES: true,
        READ_MESSAGE_HISTORY: true
      });
  
      await interaction.followUp(`Kullanıcı eklendi ve kanal izinleri düzenlendi: ${targetMember.user.username}`);
    } catch (error) {
      console.error(error);
      await interaction.followUp('Bir hata oluştu.');
    }
  }

  if (interaction.customId === 'remove_user') {
    const filter = response => {
      return response.author.id === interaction.user.id;
    };

    try {
      await interaction.reply({
        content: 'Çıkarmak istediğiniz kullanıcının kimliğini (ID) girin:',
        ephemeral: true
      });

      const userResponse = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
      const userID = userResponse.first().content;

      const targetMember = interaction.guild.members.cache.get(userID);
      if (!targetMember) {
        await interaction.followUp('Belirtilen kimlikle bir kullanıcı bulunamadı.');
        return;
      }

      const channel = interaction.channel;

      const targetPermission = {
        id: targetMember.id,
        deny: ['VIEW_CHANNEL'],
      };

      await channel.permissionOverwrites.create(targetMember, targetPermission);
      await interaction.followUp(`Kullanıcı çıkarıldı: ${targetMember.user.username}`);
    } catch (error) {
      console.error(error);
      await interaction.followUp('Bir hata oluştu.');
    }
  }
});