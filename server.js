const express = require('express');
const { Client, GatewayIntentBits, Options, WebhookClient } = require('discord.js');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Configuración del Bot de Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [
        'MESSAGE',
        'CHANNEL', 
        'REACTION',
        'USER',
        'GUILD_MEMBER'
    ],
    makeCache: Options.cacheWithLimits({
        ...Options.defaultMakeCacheSettings,
        'GuildMemberManager': {
            maxSize: 500,
            keepOverLimit: member => !member.user.bot
        }
    })
});

// Variables globales
let serverStats = {
    onlineUsers: 0,
    activeAttacks: 0,
    serverLoad: 0,
    uptime: 0,
    totalUsers: 0,
    successRate: 95,
    users: [],
    guild: null,
    lastUpdate: new Date()
};

// Webhook Clients
const purchaseWebhook = process.env.PURCHASE_WEBHOOK_URL ? new WebhookClient({ url: process.env.PURCHASE_WEBHOOK_URL }) : null;
const joinWebhook = process.env.JOIN_WEBHOOK_URL ? new WebhookClient({ url: process.env.JOIN_WEBHOOK_URL }) : null;

// Obtener Guild ID desde variables de entorno
const GUILD_ID = process.env.GUILD_ID || null;
const INVITE_URL = process.env.INVITE_URL || 'https://discord.gg/tu-invite';

// Comandos del bot
const commands = {
    '!help': 'Muestra todos los comandos disponibles',
    '!methods': 'Muestra todos los métodos de ataque disponibles',
    '!status': 'Muestra el estado actual del servidor',
    '!info': 'Muestra información sobre BigNet',
    '!guildid': 'Muestra el ID del servidor actual'

};

// Métodos de ataque disponibles
const attackMethods = {
    'udp': 'UDP Flood - Envía paquetes UDP masivos',
    'tcp': 'TCP Flood - Satura conexiones TCP',
    'syn': 'SYN Flood - Ataque de handshake TCP',
    'mix': 'MIX Attack - Combina múltiples métodos',
    'vse': 'VSE Protocol - Para Valve Source Engine',
    'fivem': 'FIVEM Attack - Específico para servidores FiveM',
    'ovhudp': 'OVH-UDP - Bypass para protección OVH',
    'ovhtcp': 'OVH-TCP - TCP randomizado para WAF',
    'discord': 'Discord Attack - Específico para Discord'
};

// Planes de precios
const pricingPlans = {
    'basic': {
        name: 'Plan Básico',
        price: 40,
        features: ['3 métodos de ataque', 'Soporte básico', 'Duración máxima: 1 hora'],
        duration: '1 mes'
    },
    'pro': {
        name: 'Plan Pro',
        price: 55,
        features: ['Todos los métodos', 'Soporte prioritario', 'Duración máxima: 3 horas', 'Panel personalizado'],
        duration: '1 mes'
    },
    'enterprise': {
        name: 'Plan Enterprise',
        price: 70,
        features: ['Todos los métodos', 'Soporte 24/7', 'Duración ilimitada', 'Panel personalizado', 'Consultoría'],
        duration: '1 mes'
    },
    'lifetime': {
        name: 'Plan Lifetime',
        price: 150,
        features: ['Acceso permanente', 'Todos los métodos', 'Soporte 24/7', 'Actualizaciones gratuitas', 'Panel premium'],
        duration: 'Permanente'
    }
};

// Función para obtener el guild específico o el primero disponible
function getTargetGuild() {
    if (GUILD_ID) {
        const specificGuild = client.guilds.cache.get(GUILD_ID);
        if (specificGuild) {
            return specificGuild;
        } else {
            console.log(`❌ No se encontró el servidor con ID: ${GUILD_ID}`);
        }
    }
    
    return client.guilds.cache.first();
}

// Función para obtener íconos de estado
function getStatusIcon(status) {
    const icons = {
        'online': '🟢',
        'idle': '🟡',
        'dnd': '🔴',
        'offline': '⚫'
    };
    return icons[status] || '⚫';
}

// Función para obtener estadísticas del servidor
async function getServerStats() {
    return serverStats;
}

// Función para enviar notificación de compra al webhook
async function sendPurchaseNotification(purchaseData) {
    if (!purchaseWebhook) {
        console.log('❌ Webhook de compras no configurado');
        return false;
    }

    try {
        const embed = {
            title: '🛒 Nueva Compra Recibida',
            color: 0x00ff00,
            fields: [
                {
                    name: '📦 Producto',
                    value: purchaseData.product,
                    inline: true
                },
                {
                    name: '💳 Precio',
                    value: `$${purchaseData.price}`,
                    inline: true
                },
                {
                    name: '👤 Cliente',
                    value: purchaseData.discordId || 'No especificado',
                    inline: true
                },
                {
                    name: '📧 Email',
                    value: purchaseData.email || 'No especificado',
                    inline: true
                },
                {
                    name: '🆔 Order ID',
                    value: purchaseData.orderId,
                    inline: true
                },
                {
                    name: '⏰ Fecha',
                    value: new Date().toLocaleString('es-ES'),
                    inline: true
                }
            ],
            timestamp: new Date(),
            footer: {
                text: 'BigNet Sales System'
            }
        };

        await purchaseWebhook.send({
            embeds: [embed]
        });

        console.log(`✅ Notificación de compra enviada: ${purchaseData.orderId}`);
        return true;
    } catch (error) {
        console.error('❌ Error enviando notificación de compra:', error);
        return false;
    }
}

// Función para enviar notificación de nuevo miembro al webhook
async function sendJoinNotification(member) {
    if (!joinWebhook) {
        console.log('❌ Webhook de miembros no configurado');
        return false;
    }

    try {
        const embed = {
            title: '🎉 Nuevo Miembro en el Servidor',
            color: 0x0099ff,
            thumbnail: {
                url: member.user.displayAvatarURL()
            },
            fields: [
                {
                    name: '👤 Usuario',
                    value: `${member.user.username}#${member.user.discriminator}`,
                    inline: true
                },
                {
                    name: '🆔 ID',
                    value: member.user.id,
                    inline: true
                },
                {
                    name: '📅 Cuenta Creada',
                    value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
                    inline: true
                },
                {
                    name: '👥 Total de Miembros',
                    value: member.guild.memberCount.toString(),
                    inline: true
                }
            ],
            timestamp: new Date(),
            footer: {
                text: 'BigNet Community'
            }
        };

        await joinWebhook.send({
            embeds: [embed]
        });

        console.log(`✅ Notificación de nuevo miembro enviada: ${member.user.username}`);
        return true;
    } catch (error) {
        console.error('❌ Error enviando notificación de nuevo miembro:', error);
        return false;
    }
}

// Evento cuando el bot se conecta
client.on('ready', () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
    console.log(`🏰 Servidores conectados: ${client.guilds.cache.size}`);
    
    // Verificar webhooks
    if (purchaseWebhook) {
        console.log('🛒 Webhook de compras configurado');
    } else {
        console.log('❌ Webhook de compras NO configurado');
    }
    
    if (joinWebhook) {
        console.log('👥 Webhook de miembros configurado');
    } else {
        console.log('❌ Webhook de miembros NO configurado');
    }
    
    client.guilds.cache.forEach(guild => {
        console.log(`   - ${guild.name} (ID: ${guild.id})`);
    });
    
    updateServerStats();
    setInterval(updateServerStats, 30000);
});

// Evento cuando un nuevo miembro se une al servidor
client.on('guildMemberAdd', async (member) => {
    console.log(`🎉 Nuevo miembro: ${member.user.username}`);
    
    // Enviar notificación al webhook
    await sendJoinNotification(member);
    
    // Opcional: Dar la bienvenida en un canal específico
    const welcomeChannel = member.guild.channels.cache.find(
        channel => channel.name.includes('bienvenida') || channel.name.includes('welcome')
    );
    
    if (welcomeChannel) {
        const welcomeEmbed = {
            color: 0x00ff00,
            title: `🎉 ¡Bienvenido a ${member.guild.name}!`,
            description: `Hola ${member.user}, gracias por unirte a nuestra comunidad.`,
            fields: [
                {
                    name: '📊 Miembros',
                    value: `Ahora somos ${member.guild.memberCount} miembros`,
                    inline: true
                },
                {
                    name: '📝 Comandos',
                    value: 'Usa `!help` para ver los comandos disponibles',
                    inline: true
                },
                
            ],
            thumbnail: {
                url: member.user.displayAvatarURL()
            },
            timestamp: new Date()
        };
        
        try {
            await welcomeChannel.send({ embeds: [welcomeEmbed] });
        } catch (error) {
            console.log('⚠️ No se pudo enviar mensaje de bienvenida:', error.message);
        }
    }
});

// Evento cuando llega un mensaje
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const content = message.content.toLowerCase();
    
    // Comando de ayuda
    if (content === '!help' || content === '!comandos') {
        let helpText = '**🤖 Comandos de BigNet Bot:**\n\n';
        for (const [cmd, desc] of Object.entries(commands)) {
            helpText += `**${cmd}** - ${desc}\n`;
        }
        message.reply(helpText);
    }
    
    // Comando de métodos
    if (content === '!methods' || content === '!metodos') {
        let methodsText = '**🎯 Métodos de Ataque Disponibles:**\n\n';
        for (const [method, desc] of Object.entries(attackMethods)) {
            methodsText += `**${method.toUpperCase()}** - ${desc}\n`;
        }
        message.reply(methodsText);
    }
    
    // Comando de estado
    if (content === '!status' || content === '!estado') {
        const stats = await getServerStats();
        const statusText = `**📊 Estado del Servidor BigNet:**\n
👥 Usuarios Conectados: ${stats.onlineUsers}
⚡ Ataques Activos: ${stats.activeAttacks}
🖥️ Carga del Servidor: ${stats.serverLoad}%
⏰ Tiempo Activo: ${formatUptime(stats.uptime)}
📈 Tasa de Éxito: ${stats.successRate}%`;
        
        message.reply(statusText);
    }
  
    // Comando de información del servidor
    if (content === '!guildid' || content === '!serverid') {
        const guild = getTargetGuild();
        if (guild) {
            message.reply(`**🏰 Información del Servidor:**\nNombre: ${guild.name}\nID: ${guild.id}\nMiembros: ${guild.memberCount}`);
        } else {
            message.reply('❌ No se pudo obtener información del servidor');
        }
    }
    
    // Comando de información
    if (content === '!info' || content === '!acerca') {
        const infoText = `**🌐 BigNet - The Best BotNet**\n
🚀 **Servicios Premium de DDoS**
💻 **${Object.keys(attackMethods).length} Métodos Especializados**
🛡️ **Máxima Eficiencia y Seguridad**
📞 **Soporte 24/7**

🔗 **Sitio Web:** https://bignettest.onrender.com
👥 **Únete:** ${INVITE_URL}
💎 **Planes desde €${pricingPlans.basic.price}**`;
        
        message.reply(infoText);
    }
    
    // Comando de ataque (simulado)
    if (content.startsWith('!attack')) {
        const args = content.split(' ');
        if (args.length < 4) {
            message.reply('**❌ Uso correcto:** !attack <método> <objetivo> <duración>');
            return;
        }
        
        const method = args[1];
        const target = args[2];
        const duration = args[3];
        
        if (!attackMethods[method]) {
            message.reply(`**❌ Método no válido.** Usa !methods para ver los disponibles.`);
            return;
        }
        
        // Simular inicio de ataque
        serverStats.activeAttacks++;
        
        message.reply(`**🎯 Ataque Iniciado!**\nMétodo: ${method.toUpperCase()}\nObjetivo: ${target}\nDuración: ${duration} segundos\n\n⚠️ **ADVERTENCIA:** Este es un sistema de demostración.`);
        
        setTimeout(() => {
            serverStats.activeAttacks = Math.max(0, serverStats.activeAttacks - 1);
            message.channel.send(`**✅ Ataque completado:** ${method.toUpperCase()} contra ${target}`);
        }, Math.min(parseInt(duration) * 1000, 30000));
    }
});

async function updateServerStats() {
    try {
        const guild = getTargetGuild();
        if (!guild) {
            console.log('❌ No hay servidores disponibles');
            return;
        }
        
        // Cargar miembros
        try {
            await guild.members.fetch({ 
                withPresences: true,
                force: false
            });
        } catch (error) {
            console.log('⚠️ No se pudieron cargar presencias:', error.message);
        }
        
        const members = guild.members.cache;
        const allHumanMembers = members.filter(member => !member.user.bot);
        
        // Contadores por estado
        const statusCounts = {
            online: allHumanMembers.filter(m => m.presence?.status === 'online').size,
            idle: allHumanMembers.filter(m => m.presence?.status === 'idle').size,
            dnd: allHumanMembers.filter(m => m.presence?.status === 'dnd').size,
            offline: allHumanMembers.filter(m => !m.presence || m.presence.status === 'offline').size
        };
        
        // Actualizar estadísticas
        const onlineCount = statusCounts.online + statusCounts.idle + statusCounts.dnd;
        const totalHumanCount = allHumanMembers.size;
        
        serverStats = {
            onlineUsers: onlineCount,
            activeAttacks: serverStats.activeAttacks,
            serverLoad: totalHumanCount > 0 ? Math.min(Math.floor((onlineCount / totalHumanCount) * 100), 100) : 0,
            uptime: Math.floor(process.uptime()),
            totalUsers: totalHumanCount,
            successRate: 95 + Math.floor(Math.random() * 5),
            
            users: Array.from(allHumanMembers.values()).slice(0, 100).map(member => ({
                id: member.user.id,
                name: member.user.global_name || member.user.username,
                username: member.user.username,
                discriminator: member.user.discriminator,
                avatar: member.user.avatar,
                status: member.presence?.status || 'offline',
                isBot: member.user.bot,
                roles: member.roles?.cache?.map(role => role.name) || [],
                joinedAt: member.joinedAt
            })),
            
            guild: {
                name: guild.name,
                id: guild.id,
                memberCount: guild.memberCount,
                createdTimestamp: guild.createdTimestamp
            },
            lastUpdate: new Date()
        };
        
    } catch (error) {
        console.error('❌ Error actualizando estadísticas:', error);
        serverStats = {
            ...serverStats,
            uptime: Math.floor(process.uptime()),
            lastUpdate: new Date()
        };
    }
}

// === RUTAS API ===

// Endpoint para procesar compras
app.post('/api/purchase', async (req, res) => {
    try {
        const { product, discordId, email, price, plan } = req.body;
        
        if (!product || !price) {
            return res.status(400).json({
                success: false,
                error: 'Producto y precio son requeridos'
            });
        }
        
        const orderId = 'ORD-' + Date.now();
        const purchaseData = {
            product,
            discordId: discordId || 'No especificado',
            email: email || 'No especificado',
            price,
            plan: plan || 'custom',
            orderId,
            timestamp: new Date()
        };
        
        console.log('🛒 Nueva compra recibida:', purchaseData);
        
        // Enviar notificación al webhook de Discord
        const webhookSent = await sendPurchaseNotification(purchaseData);
        
        // Simular procesamiento de pago
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        res.json({ 
            success: true, 
            message: 'Compra procesada correctamente',
            orderId: orderId,
            webhookSent: webhookSent,
            data: purchaseData
        });
        
    } catch (error) {
        console.error('❌ Error procesando compra:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Endpoint para obtener planes de precios
app.get('/api/pricing', (req, res) => {
    res.json({
        success: true,
        data: pricingPlans,
        timestamp: new Date().toISOString()
    });
});

// Endpoint para crear invitación al servidor
app.get('/api/invite', (req, res) => {
    res.json({
        success: true,
        data: {
            inviteUrl: INVITE_URL,
            botInviteUrl: `https://discord.com/oauth2/authorize?client_id=${client.user?.id}&permissions=8&scope=bot%20applications.commands`,
            guildId: GUILD_ID
        },
        timestamp: new Date().toISOString()
    });
});

// Endpoint para verificar webhooks
app.get('/api/webhooks/status', (req, res) => {
    res.json({
        success: true,
        data: {
            purchaseWebhook: !!purchaseWebhook,
            joinWebhook: !!joinWebhook,
            guild: getTargetGuild()?.name || 'No disponible'
        },
        timestamp: new Date().toISOString()
    });
});

// Obtener estadísticas del servidor
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await getServerStats();
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error obteniendo estadísticas'
        });
    }
});

// Obtener usuarios online
app.get('/api/online-users', async (req, res) => {
    try {
        const stats = await getServerStats();
        res.json({
            success: true,
            data: stats.users,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error obteniendo usuarios online'
        });
    }
});

// Rutas para páginas web
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/pricing', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pricing.html'));
});

app.get('/buy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'buy.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/terms', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

// Endpoint de salud
app.get('/health', (req, res) => {
    const guild = getTargetGuild();
    res.status(200).json({ 
        status: 'OK', 
        bot: client.user ? `Conectado como ${client.user.tag}` : 'Desconectado',
        guild: guild ? `${guild.name} (${guild.id})` : 'No configurado',
        webhooks: {
            purchase: !!purchaseWebhook,
            join: !!joinWebhook
        },
        timestamp: new Date().toISOString()
    });
});

// Función para formatear tiempo
function formatUptime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

// Manejar cierre graceful
process.on('SIGINT', async () => {
    console.log('\n🛑 Apagando bot...');
    client.destroy();
    process.exit(0);
});

// Iniciar el bot de Discord
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('❌ ERROR: No se configuró el token del bot');
    console.log('💡 Configura la variable de entorno BOT_TOKEN');
    process.exit(1);
}

// Iniciar servidor web
app.listen(PORT, () => {
    console.log(`🌐 Servidor web ejecutándose en puerto ${PORT}`);
    console.log(`📊 Panel disponible en http://localhost:${PORT}`);
    console.log(`🛒 Sistema de compras activado`);
    console.log(`👥 Sistema de miembros activado`);
});

// Conectar el bot
client.login(BOT_TOKEN).catch(error => {
    console.error('❌ Error iniciando el bot:', error);
    process.exit(1);
});
