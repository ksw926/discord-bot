const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('거점봇 작동 중!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 웹 서버가 포트 ${PORT}에서 실행 중입니다.`);
});

require('dotenv').config();
const { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder,
  PermissionFlagsBits 
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const MAX_PARTICIPANTS = 25;

// 🔒 관리자가 아니더라도 명령어를 사용할 수 있는 특정 유저 ID 목록
const ALLOWED_USER_IDS = ['313250401883258882']; 

const participantData = {
  classes: {
    '전승 워리어': [], '전승 소서러': [], '전승 자이언트': [], '전승 레인저': [], '전승 금수랑': [],
    '전승 무사': [], '전승 발키리': [], '전승 매화': [], '전승 쿠노이치': [], '전승 닌자': [],
    '전승 위자드': [], '전승 위치': [], '전승 다크나이트': [], '전승 격투가': [], '전승 미스틱': [],
    '전승 란': [], '전승 가디언': [], '전승 하사신': [], '전승 노바': [], '전승 세이지': [],
    '전승 커세어': [], '전승 드라카니아': [], '전승 우사': [], '전승 매구': [], '전승 도사': [],
    
    '각성 워리어': [], '각성 소서러': [], '각성 자이언트': [], '각성 레인저': [], '각성 금수랑': [],
    '각성 무사': [], '각성 발키리': [], '각성 매화': [], '각성 쿠노이치': [], '각성 닌자': [],
    '각성 위자드': [], '각성 위치': [], '각성 다크나이트': [], '각성 격투가': [], '각성 미스틱': [],
    '각성 란': [], '각성 가디언': [], '각성 하사신': [], '각성 노바': [], '각성 세이지': [],
    '각성 커세어': [], '각성 드라카니아': [], '각성 우사': [], '각성 매구': [], '각성 도사': [],
    
    '아처': [], '샤이': [], '스칼라': [], '데드아이': [], '오공': [], '세라핌': []
  },
  sub: {
    '빌더': [], '불퇴': [], '신기전': [], 
    '화염탑 1': [], '화염탑 2': [], 
    '코끼리': [], '대포 1': [], '대포 2': []
  },
  waitingList: [],
  applyHistory: [],  
  cancelHistory: [], 
  userFavorites: {}   
};

const SINGLE_SLOT_SUBS = ['화염탑 1', '화염탑 2', '대포 1', '대포 2'];

function getTotalClassCount() {
  let count = 0;
  for (const key in participantData.classes) count += participantData.classes[key].length;
  return count;
}

function getTotalSubCount() {
  let count = 0;
  for (const key in participantData.sub) count += participantData.sub[key].length;
  return count;
}

function getUserAppliedStatus(userId) {
  let hasClass = Object.values(participantData.classes).some(arr => arr.includes(userId));
  let hasSub = Object.values(participantData.sub).some(arr => arr.includes(userId));
  if (participantData.waitingList.some(item => item.id === userId)) hasClass = true;

  return { hasClass, hasSub, hasAny: hasClass || hasSub };
}

function getTimeString() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}

function generateStatusEmbed() {
  const classCount = getTotalClassCount();
  const subCount = getTotalSubCount();
  const totalCount = classCount + subCount; 

  const embed = new EmbedBuilder()
    .setTitle(`⚔️ 거점전 신청 현황 (총 ${totalCount}명)`)
    .setColor(totalCount >= MAX_PARTICIPANTS ? '#e67e22' : '#2ecc71')
    .setTimestamp();

  let classText = '';
  for (const [cls, users] of Object.entries(participantData.classes)) {
    if (users.length > 0) classText += `**${cls} (${users.length}명)**: ${users.map(u => `<@${u}>`).join(', ')}\n`;
  }
  embed.addFields({ name: `🛡️ 본대 신청 현황 (${classCount}명)`, value: classText || '없음' });

  let subText = '';
  for (const [sub, users] of Object.entries(participantData.sub)) {
    subText += `**${sub}**: ${users.length > 0 ? users.map(u => `<@${u}>`).join(', ') : '없음'}\n`;
  }
  embed.addFields({ name: `🛠️ 특수조 담당 현황 (${subCount}명)`, value: subText });

  let waitingText = participantData.waitingList.length > 0 
    ? participantData.waitingList.map((item, idx) => `${idx + 1}. <@${item.id}> (${item.class})`).join('\n')
    : '없음';
  embed.addFields({ name: `⏳ 대기자 명단 (${participantData.waitingList.length}명)`, value: waitingText });

  return embed;
}

function generateHistoryEmbed() {
  const embed = new EmbedBuilder()
    .setTitle(`📜 거점전 실시간 기록 로그`)
    .setColor('#3498db')
    .setTimestamp();

  const applyLogs = participantData.applyHistory.slice().reverse();
  const cancelLogs = participantData.cancelHistory.slice().reverse();

  let applyText = '';
  for (const log of applyLogs) {
    if ((applyText + log + '\n').length > 1000) break;
    applyText += log + '\n';
  }

  let cancelText = '';
  for (const log of cancelLogs) {
    if ((cancelText + log + '\n').length > 1000) break;
    cancelText += log + '\n';
  }

  embed.addFields({ name: `📜 거점 신청 현황 (총 ${participantData.applyHistory.length}건)`, value: applyText || '기록 없음', inline: false });
  embed.addFields({ name: `❌ 거점 취소 현황 (총 ${participantData.cancelHistory.length}건)`, value: cancelText || '기록 없음', inline: false });

  return embed;
}

function generateMainButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_apply').setLabel('거점 신청').setStyle(ButtonStyle.Primary).setEmoji('⚔️'),
      new ButtonBuilder().setCustomId('btn_cancel').setLabel('신청 취소').setStyle(ButtonStyle.Danger).setEmoji('❌'),
      new ButtonBuilder().setCustomId('btn_favorite').setLabel('즐겨찾기').setStyle(ButtonStyle.Success).setEmoji('⭐'),
      new ButtonBuilder().setCustomId('btn_refresh').setLabel('새로고침').setStyle(ButtonStyle.Secondary).setEmoji('🔄')
    )
  ];
}

function generateCategorySelect() {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_category')
        .setPlaceholder('신청할 전승/각성/특수조 카테고리를 선택하세요.')
        .addOptions([
          { label: '🗡️ 전승 클래스 선택', value: 'category_succ', description: '전승 클래스 목록을 열어 선택합니다.' },
          { label: '⚔️ 각성 클래스 선택', value: 'category_awak', description: '각성 클래스 목록을 열어 선택합니다.' },
          { label: '🏹 개방 클래스 선택', value: 'category_open', description: '개방 클래스 목록을 열어 선택합니다.' },
          { label: '🛠️ 특수조 담당 선택', value: 'category_sub', description: '특수조 담당 목록을 열어 선택합니다.' }
        ])
    )
  ];
}

function generateFavoriteRootMenu(userId) {
  const currentFav = participantData.userFavorites[userId];
  const options = [];

  if (currentFav) {
    options.push({
      label: `⭐ 즐겨찾기 선택 (${currentFav} 신청)`,
      value: 'fav_action_apply',
      description: `미리 설정한 [${currentFav}](으)로 거점전에 신청합니다.`
    });
  }

  options.push(
    { label: '➕ 즐겨찾기 추가/변경', value: 'fav_action_add', description: '즐겨찾기로 등록할 카테고리를 선택합니다.' },
    { label: '🗑️ 즐겨찾기 삭제', value: 'fav_action_delete', description: '현재 설정된 즐겨찾기를 삭제합니다.' }
  );

  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_fav_root')
        .setPlaceholder(currentFav ? `현재 즐겨찾기: ${currentFav}` : '즐겨찾기 메뉴를 선택하세요.')
        .addOptions(options)
    )
  ];
}

function generateFavoriteCategorySelect() {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_fav_category')
        .setPlaceholder('즐겨찾기로 등록할 카테고리를 선택하세요.')
        .addOptions([
          { label: '🗡️ 전승 클래스 등록', value: 'fav_cat_succ', description: '전승 클래스 중 하나를 지정합니다.' },
          { label: '⚔️ 각성 클래스 등록', value: 'fav_cat_awak', description: '각성 클래스 중 하나를 지정합니다.' },
          { label: '🏹 개방 클래스 등록', value: 'fav_cat_open', description: '개방 클래스 중 하나를 지정합니다.' },
          { label: '🛠️ 특수조 담당 등록', value: 'fav_cat_sub', description: '특수조 항목 중 하나를 지정합니다.' },
          { label: '🗑️ 즐겨찾기 삭제', value: 'fav_action_delete', description: '현재 설정된 즐겨찾기를 삭제합니다.' }
        ])
    )
  ];
}

function generateDetailSelect(category, isFavoriteMode = false) {
  let placeholder = '';
  let options = [];
  const targetCategory = category.replace('fav_cat_', 'category_');

  if (targetCategory === 'category_succ') {
    placeholder = '전승 클래스를 선택하세요';
    options = [
      { label: '전승 워리어', value: '전승 워리어' }, { label: '전승 소서러', value: '전승 소서러' },
      { label: '전승 자이언트', value: '전승 자이언트' }, { label: '전승 레인저', value: '전승 레인저' },
      { label: '전승 금수랑', value: '전승 금수랑' }, { label: '전승 무사', value: '전승 무사' },
      { label: '전승 발키리', value: '전승 발키리' }, { label: '전승 매화', value: '전승 매화' },
      { label: '전승 쿠노이치', value: '전승 쿠노이치' }, { label: '전승 닌자', value: '전승 닌자' },
      { label: '전승 위자드', value: '전승 위자드' }, { label: '전승 위치', value: '전승 위치' },
      { label: '전승 다크나이트', value: '전승 다크나이트' }, { label: '전승 격투가', value: '전승 격투가' },
      { label: '전승 미스틱', value: '전승 미스틱' }, { label: '전승 란', value: '전승 란' },
      { label: '전승 가디언', value: '전승 가디언' }, { label: '전승 하사신', value: '전승 하사신' },
      { label: '전승 노바', value: '전승 노바' }, { label: '전승 세이지', value: '전승 세이지' },
      { label: '전승 커세어', value: '전승 커세어' }, { label: '전승 드라카니아', value: '전승 드라카니아' },
      { label: '전승 우사', value: '전승 우사' }, { label: '전승 매구', value: '전승 매구' },
      { label: '전승 도사', value: '전승 도사' }
    ];
  } else if (targetCategory === 'category_awak') {
    placeholder = '각성 클래스를 선택하세요';
    options = [
      { label: '각성 워리어', value: '각성 워리어' }, { label: '각성 소서러', value: '각성 소서러' },
      { label: '각성 자이언트', value: '각성 자이언트' }, { label: '각성 레인저', value: '각성 레인저' },
      { label: '각성 금수랑', value: '각성 금수랑' }, { label: '각성 무사', value: '각성 무사' },
      { label: '각성 발키리', value: '각성 발키리' }, { label: '각성 매화', value: '각성 매화' },
      { label: '각성 쿠노이치', value: '각성 쿠노이치' }, { label: '각성 닌자', value: '각성 닌자' },
      { label: '각성 위자드', value: '각성 위자드' }, { label: '각성 위치', value: '각성 위치' },
      { label: '각성 다크나이트', value: '각성 다크나이트' }, { label: '각성 격투가', value: '각성 격투가' },
      { label: '각성 미스틱', value: '각성 미스틱' }, { label: '각성 란', value: '각성 란' },
      { label: '각성 가디언', value: '각성 가디언' }, { label: '각성 하사신', value: '각성 하사신' },
      { label: '각성 노바', value: '각성 노바' }, { label: '각성 세이지', value: '각성 세이지' },
      { label: '각성 커세어', value: '각성 커세어' }, { label: '각성 드라카니아', value: '각성 드라카니아' },
      { label: '각성 우사', value: '각성 우사' }, { label: '각성 매구', value: '각성 매구' },
      { label: '각성 도사', value: '각성 도사' }
    ];
  } else if (targetCategory === 'category_open') {
    placeholder = '개방 클래스를 선택하세요';
    options = [
      { label: '아처', value: '아처' }, { label: '샤이', value: '샤이' },
      { label: '스칼라', value: '스칼라' }, { label: '데드아이', value: '데드아이' },
      { label: '오공', value: '오공' }, { label: '세라핌', value: '세라핌' }
    ];
  } else if (targetCategory === 'category_sub') {
    placeholder = '특수조 담당을 선택하세요';
    options = [
      { label: '빌더', value: '빌더', emoji: '🔨' },
      { label: '불퇴', value: '불퇴', emoji: '🚩' },
      { label: '신기전', value: '신기전', emoji: '🚀' },
      { label: '화염탑 1', value: '화염탑 1', emoji: '🔥' },
      { label: '화염탑 2', value: '화염탑 2', emoji: '🔥' },
      { label: '코끼리', value: '코끼리', emoji: '🐘' },
      { label: '대포 1', value: '대포 1', emoji: '💣' },
      { label: '대포 2', value: '대포 2', emoji: '💣' }
    ];
  }

  const customId = isFavoriteMode ? 'select_save_favorite' : 'select_detail_class';

  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder(placeholder).addOptions(options)
    )
  ];
}

function registerUserApplication(userId, username, selectedValue, time) {
  if (participantData.sub.hasOwnProperty(selectedValue)) {
    if (SINGLE_SLOT_SUBS.includes(selectedValue)) {
      participantData.sub[selectedValue] = [userId];
    } else {
      if (!participantData.sub[selectedValue].includes(userId)) {
        participantData.sub[selectedValue].push(userId);
      }
    }
    participantData.applyHistory.push(`\`[${time}]\` **${username}** ➡️ **[${selectedValue}]** 특수조 담당`);
  } else if (participantData.classes.hasOwnProperty(selectedValue)) {
    if (getTotalClassCount() < MAX_PARTICIPANTS) {
      if (!participantData.classes[selectedValue].includes(userId)) {
        participantData.classes[selectedValue].push(userId);
      }
      participantData.applyHistory.push(`\`[${time}]\` **${username}** ➡️ **[${selectedValue}]** 클래스 신청`);
    } else {
      if (!participantData.waitingList.some(item => item.id === userId)) {
        participantData.waitingList.push({ id: userId, name: username, class: selectedValue });
      }
      participantData.applyHistory.push(`\`[${time}]\` **${username}** ⏳ **[${selectedValue}]** 대기자 등록`);
    }
  }
}

client.on('ready', () => {
  console.log(`✅ ${client.user.tag} 봇이 성공적으로 실행되었습니다!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === '!거점와써') {
    const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);
    const isAllowedUser = ALLOWED_USER_IDS.includes(message.author.id);

    if (!isAdmin && !isAllowedUser) {
      const replyMsg = await message.reply('⚠️ `!거점와써` 명령어는 서버 관리자 또는 지정된 사용자만 이용할 수 있습니다.');
      setTimeout(() => {
        message.delete().catch(() => {});
        replyMsg.delete().catch(() => {});
      }, 3000);
      return;
    }

    message.delete().catch(() => {});

    await message.channel.send({
      embeds: [generateStatusEmbed(), generateHistoryEmbed()],
      components: generateMainButtons(),
    });
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;

  try {
    const userId = interaction.user.id;
    const username = interaction.user.displayName || interaction.user.username;
    const time = getTimeString();

    // 1. 버튼 동작
    if (interaction.isButton()) {
      if (interaction.customId === 'btn_apply') {
        const status = getUserAppliedStatus(userId);
        if (status.hasAny) {
          return await interaction.reply({ 
            content: '❌ 이미 거점전 신청 내역이 존재합니다. [신청 취소] 버튼을 누르고 다시 시도해 주세요.', 
            ephemeral: true 
          });
        }

        await interaction.update({
          embeds: [generateStatusEmbed(), generateHistoryEmbed()],
          components: generateCategorySelect(),
        });
      } 
      else if (interaction.customId === 'btn_favorite') {
        await interaction.update({
          embeds: [generateStatusEmbed(), generateHistoryEmbed()],
          components: generateFavoriteRootMenu(userId),
        });
      }
      else if (interaction.customId === 'btn_cancel') {
        let isCanceled = false;

        for (const key in participantData.classes) {
          if (participantData.classes[key].includes(userId)) {
            participantData.classes[key] = participantData.classes[key].filter(id => id !== userId);
            isCanceled = true;
          }
        }
        for (const key in participantData.sub) {
          if (participantData.sub[key].includes(userId)) {
            participantData.sub[key] = participantData.sub[key].filter(id => id !== userId);
            isCanceled = true;
          }
        }
        const waitingIndex = participantData.waitingList.findIndex(item => item.id === userId);
        if (waitingIndex !== -1) {
          participantData.waitingList.splice(waitingIndex, 1);
          isCanceled = true;
        }

        if (isCanceled) {
          participantData.cancelHistory.push(`\`[${time}]\` **${username}** ❌ 거점 신청 전체 취소`);

          if (getTotalClassCount() < MAX_PARTICIPANTS && participantData.waitingList.length > 0) {
            const nextUser = participantData.waitingList.shift();
            participantData.classes[nextUser.class].push(nextUser.id);
            participantData.applyHistory.push(`\`[${time}]\` **${nextUser.name}** 🎉 대기 ➡️ **[${nextUser.class}]** 승급`);
          }

          await interaction.update({
            embeds: [generateStatusEmbed(), generateHistoryEmbed()],
            components: generateMainButtons(),
          });
        } else {
          await interaction.reply({ content: '❌ 신청 내역이 존재하지 않습니다.', ephemeral: true });
        }
      } 
      else if (interaction.customId === 'btn_refresh') {
        await interaction.update({
          embeds: [generateStatusEmbed(), generateHistoryEmbed()],
          components: generateMainButtons(),
        });
      }
    } 
    // 2. 셀렉트 메뉴 동작
    else if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'select_category') {
        const selectedValue = interaction.values[0];
        await interaction.update({
          embeds: [generateStatusEmbed(), generateHistoryEmbed()],
          components: generateDetailSelect(selectedValue, false),
        });
      } 
      else if (interaction.customId === 'select_detail_class') {
        const selectedValue = interaction.values[0];
        registerUserApplication(userId, username, selectedValue, time);

        await interaction.update({
          embeds: [generateStatusEmbed(), generateHistoryEmbed()],
          components: generateMainButtons(),
        });
      }
      else if (interaction.customId === 'select_fav_root') {
        const selectedValue = interaction.values[0];

        if (selectedValue === 'fav_action_apply') {
          const status = getUserAppliedStatus(userId);
          if (status.hasAny) {
            return await interaction.reply({ 
              content: '❌ 이미 거점전 신청 내역이 존재합니다. [신청 취소] 버튼을 누르고 다시 시도해 주세요.', 
              ephemeral: true 
            });
          }

          const favClass = participantData.userFavorites[userId];
          registerUserApplication(userId, username, favClass, time);

          await interaction.update({
            embeds: [generateStatusEmbed(), generateHistoryEmbed()],
            components: generateMainButtons(),
          });
        } 
        else if (selectedValue === 'fav_action_add') {
          await interaction.update({
            embeds: [generateStatusEmbed(), generateHistoryEmbed()],
            components: generateFavoriteCategorySelect(),
          });
        }
        else if (selectedValue === 'fav_action_delete') {
          if (!participantData.userFavorites[userId]) {
            return await interaction.reply({ content: '❌ 삭제할 즐겨찾기 내역이 없습니다.', ephemeral: true });
          }
          delete participantData.userFavorites[userId];
          
          await interaction.update({
            embeds: [generateStatusEmbed(), generateHistoryEmbed()],
            components: generateMainButtons(),
          });
          await interaction.followUp({ content: '🗑️ 즐겨찾기 내역이 삭제되었습니다.', ephemeral: true });
        }
      }
      else if (interaction.customId === 'select_fav_category') {
        const selectedValue = interaction.values[0];

        if (selectedValue === 'fav_action_delete') {
          if (!participantData.userFavorites[userId]) {
            return await interaction.reply({ content: '❌ 삭제할 즐겨찾기 내역이 없습니다.', ephemeral: true });
          }
          delete participantData.userFavorites[userId];

          await interaction.update({
            embeds: [generateStatusEmbed(), generateHistoryEmbed()],
            components: generateMainButtons(),
          });
          await interaction.followUp({ content: '🗑️ 즐겨찾기 내역이 삭제되었습니다.', ephemeral: true });
        } else {
          await interaction.update({
            embeds: [generateStatusEmbed(), generateHistoryEmbed()],
            components: generateDetailSelect(selectedValue, true),
          });
        }
      }
      else if (interaction.customId === 'select_save_favorite') {
        const selectedValue = interaction.values[0];
        participantData.userFavorites[userId] = selectedValue;

        await interaction.update({
          embeds: [generateStatusEmbed(), generateHistoryEmbed()],
          components: generateMainButtons(),
        });
        await interaction.followUp({ content: `⭐ **[${selectedValue}]**(이)가 즐겨찾기로 등록되었습니다!`, ephemeral: true });
      }
    }

  } catch (error) {
    console.error('상호작용 처리 중 오류 발생:', error);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

client.login(process.env.DISCORD_TOKEN);

// Render 24시간 수면 방지 (Self-Ping)
const axios = require('axios'); // 또는 node-fetch
setInterval(() => {
  axios.get('https://wasseo-bot.onrender.com')
    .then(() => console.log('⏰ 수면 방지 Ping 전송 성공'))
    .catch((err) => console.error('Ping 에러:', err.message));
}, 14 * 60 * 1000); // 14분마다 실행
