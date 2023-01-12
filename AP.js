/* eslint-disable linebreak-style */
/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
/* eslint-disable require-jsdoc */
/* eslint-disable max-len */

require('dotenv/config');
const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const Discord = require('discord.js');
// const SlackClient = require('@slack/client').WebClient;
const bodyParser = require('body-parser');
const app = express();
const mongoUrl = process.env.DB_CONN;
const mongoDbName = 'mydb';
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      description: 'Tiago Romão | UTAD 75309',
      title: 'Activity Provider API',
      version: '1.0.0',
    },
    /*     host: 'localhost:3000',
    basePath: '/',
    produces: [
      'application/json',
    ],
    schemes: ['http'], */
  },
  apis: ['./AP.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
console.log(swaggerOptions);

let mongoClient;

// ligação a base de dados MongoDB
MongoClient.connect(mongoUrl, {useNewUrlParser: true, useUnifiedTopology: true}, (err, client) => {
  if (err) {
    console.error(err);
    return;
  }

  console.log('Ligado com sucesso ao servidor!');


  mongoClient = client;
});


app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));

/**
 * @swagger
 * paths:
 *  /config_url:
 *    get:
 *      summary: Recebe HTML de configuração da atividade
 *      tags: [1. Activity Configuration]
 *      responses:
 *        '200':
 *          description: Recebe HTML de configuração da atividade
 *          content:
 *            text/html:
 *              schema:
 *                type: string
 *                example:
 *                  <form method="POST" action="/config_url">
 *                    <label for="DiscordChID">ID Canal Discord:</label><br>
 *                    <input type="text" id="DiscordChID" name="DiscordChID"><br>
 *                    <label for="SlackChID">ID Grupo de Slack:</label><br>
 *                    <input type="text" id="SlackChID" name="SlackChID"><br>
 *                    <input type="submit" value="Submeter">
 *                  </form>
 */

// webservice para configurar uma atividade
app.get('/config_url', (req, res) => {
  console.log(swaggerDocs);
  res.send(`
    <form method="POST" action="/config_url">
      <label for="DiscordChID">ID Canal Discord:</label><br>
      <input type="text" id="DiscordChID" name="DiscordChID"><br>
      <label for="SlackChID">ID Grupo de Slack:</label><br>
      <input type="text" id="SlackChID" name="SlackChID"><br>
      <input type="submit" value="Submeter">
    </form>
  `);
});

app.post('/config_url', (req, res) => {
  const DiscordChID = req.body.DiscordChID;
  const SlackChID = req.body.SlackChID;

  generateActivityId(DiscordChID, SlackChID).then((activityID) => {
    const activity = Object.create(Activity.prototype);
    activity.DiscordChID = DiscordChID;
    activity.SlackChID = SlackChID;
    activity.activityID = activityID;
    const activitiesCollection = mongoClient.db(mongoDbName).collection('activities');
    activitiesCollection.updateOne(
        {activityID: activityID},
        {$set: {jsonParams: activity.getJsonParams(), activityID: activityID}},
        {upsert: true},
        (err, result) => {
          if (err) {
            console.error(err);
            res.sendStatus(500);
            return;
          }
          // activitySubject.notifyObservers(); // Notificar os Observadores que uma atividade foi criado
          res.send(`O <b>activityID<b/> da atividade configurada é: ${activityID}`);
        },
    );
  }).catch((error) => {
    console.log(error);
  });
});


/**
 * @swagger
 * paths:
 *  /json_params_url/{activityID}:
 *    get:
 *      summary: Recebe JSON com lista de parametros da atividade
 *      tags: [2. Activity Parameters]
 *      parameters:
 *      - in: path
 *        name: activityID
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID da atividade
 *      responses:
 *        '200':
 *          description: Recebe JSON com lista de parametros da atividade
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 */

// webservice que devolve lista dos parametros configurados de uma atividade em formato JSON
app.get('/json_params_url/:activityID', (req, res) => {
  const activityID = Number(req.params.activityID);
  const activitiesCollection = mongoClient.db(mongoDbName).collection('activities');
  activitiesCollection.findOne({activityID: activityID}, {projection: {_id: 0, updateCount: 0}}, (err, result) => {
    if (err) {
      console.error(err);
      res.sendStatus(500);
      return;
    }
    if (!result) {
      res.sendStatus(404);
      return;
    }
    activitySubject.notifyObservers(); // Notificar os Observadores que uma atividade foi atualizada
    res.send(result);
  });
});


/**
 * @swagger
 * paths:
 *  /analytics_list_url:
 *    get:
 *      summary: Recebe JSON com lista das analíticas a serem recolhidas da atividade
 *      tags: [3. List of Analytics]
 *      responses:
 *        '200':
 *          description: Recebe JSON com lista de parametros da atividade
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 */

// webservice que devolve lista de analíticas a serem recolhidas em formato JSON
app.get('/analytics_list_url', (req, res) => {
  const analytics = {
    'quantAnalytics': [
      {
        'MsgSlack': 'boolean',
      },
      {
        'MsgDiscord': 'boolean',
      },
      {
        'NumSlack': 'Number',
      },
      {
        'NumDiscord': 'Number',
      },
    ],
    'qualAnalytics': [
      {
        'DataUltMsgSlack': 'String',
      },
      {
        'DataUltMsgDiscord': 'String',
      },
    ],
  };
  res.send(analytics);
});


/**
 * @swagger
 * paths:
 *  /user_url/{activityID}:
 *    get:
 *      summary: Devolve URL com a atividade indicada no parametro
 *      tags: [4. Deploy Activity]
 *      parameters:
 *      - in: path
 *        name: activityID
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID da atividade
 *      responses:
 *        '200':
 *          description: Devolve URL com a atividade indicada no parametro
 *          content:
 *            text/html:
 *              schema:
 *                type: string
 *                example:
 *                  <form method="POST" action="/user_url">
 *                      <input type="hidden" name="activityID" value="${activityID}">
 *                      <label for="InveniRAstdID">Insira o n.º de aluno:</label><br>
 *                      <input type="text" id="InveniRAstdID" name="InveniRAstdID"><br>
 *                      <input type="hidden" name="DiscordChID" value="${doc.jsonParams.DiscordChID}">
 *                      <input type="hidden" name="SlackChID" value="${doc.jsonParams.SlackChID}">
 *                      <input type="submit" value="Submit">
 *                  </form>
 */

// webservice para efetuar o deploy de uma atividade
app.get('/user_url/:activityID', (req, res) => {
  const activityID = Number(req.params.activityID);

  const activitiesCollection = mongoClient.db(mongoDbName).collection('activities');
  activitiesCollection.findOne({activityID: activityID}, (err, doc) => {
    if (err) {
      console.error(err);
      res.sendStatus(500);
      return;
    }

    res.send(`
        <form method="POST" action="/user_url">
          <input type="hidden" name="activityID" value="${activityID}">
          <label for="InveniRAstdID">Insira o n.º de aluno:</label><br>
          <input type="text" id="InveniRAstdID" name="InveniRAstdID"><br>
          <input type="hidden" name="DiscordChID" value="${doc.jsonParams.DiscordChID}">
          <input type="hidden" name="SlackChID" value="${doc.jsonParams.SlackChID}">
          <input type="submit" value="Submit">
        </form>
      `);
  });
});


/**
 * @swagger
 * paths:
 *  /user_url:
 *    post:
 *      summary: Devolve URL da atividade seguido do ID da instancia da atividade (activityID), o id do aluno (InveniRAstdID) e os parametros da atividade
 *      tags: [4. Deploy Activity]
 *      requestBody:
 *        required: true
 *        content:
 *            application/json:
 *                schema:
 *                  type: object
 *                  properties:
 *                      activityID:
 *                          type: integer
 *                      InveniRAstdID:
 *                          type: integer
 *                      DiscordUsername:
 *                          type: integer
 *                      SlackUsername:
 *                          type: integer
 *                      json_params:
 *                          type: object
 *                          properties:
 *                                  DiscordChID:
 *                                      type: integer
 *                                  SlackChID:
 *                                      type: string
 *      responses:
 *        '200':
 *          description: Devolve URL da atividade seguido do ID da instancia da atividade (activityID)
 *          content:
 *            text/html:
 *              schema:
 *                type: string
 *                example:
 *                    <form method="POST" action="/deploy_activity/${activityID}/${InveniRAstdID}">
 *                        <input type="hidden" name="activityID" value="${activityID}">
 *                        <label for="SlackUsername">Insira o seu utilizador de Slack:</label><br>
 *                        <input type="text" id="SlackUsername" name="SlackUsername"><br>
 *                        <label for="DiscordUsername">Insira o seu utilizador de Discord:</label><br>
 *                        <input type="text" id="DiscordUsername" name="DiscordUsername"><br>
 *                        <input type="hidden" name="DiscordChID" value="${jsonParams.DiscordChID}">
 *                        <input type="hidden" name="SlackChID" value="${jsonParams.SlackChID}">
 *                        <input type="submit" value="Submit">
 *                    </form>
 */

// webservice de uma instancia da atividade realizada pelo aluno
app.post('/user_url', (req, res) => {
  const activityID = req.body.activityID;
  const InveniRAstdID = req.body.InveniRAstdID;
  const jsonParams = {
    DiscordChID: req.body.DiscordChID,
    SlackChID: req.body.SlackChID,
  };
  res.send(`
  <form method="POST" action="/deploy_activity/${activityID}/${InveniRAstdID}">
    <input type="hidden" name="activityID" value="${activityID}">
    <label for="SlackUsername">Insira o seu utilizador de Slack:</label><br>
    <input type="text" id="SlackUsername" name="SlackUsername"><br>
    <label for="DiscordUsername">Insira o seu utilizador de Discord:</label><br>
    <input type="text" id="DiscordUsername" name="DiscordUsername"><br>
    <input type="hidden" name="DiscordChID" value="${jsonParams.DiscordChID}">
    <input type="hidden" name="SlackChID" value="${jsonParams.SlackChID}">
    <input type="submit" value="Submit">
  </form>
`);
});

app.post('/deploy_activity/:activityID/:InveniRAstdID', (req, res) => {
  const activityID = req.params.activityID;
  const InveniRAstdID = req.params.InveniRAstdID;
  const SlackUsername = req.body.SlackUsername;
  const DiscordUsername = req.body.DiscordUsername;
  const DiscordChID = req.body.DiscordChID;
  const SlackChID = req.body.SlackChID;
  const jsonParams = {
    DiscordChID: req.body.DiscordChID,
    SlackChID: req.body.SlackChID,
  };
  const userActivity = {
    activityID: activityID,
    InveniRAstdID: InveniRAstdID,
    jsonParams: jsonParams,
    SlackUsername: req.body.SlackUsername,
    DiscordUsername: req.body.DiscordUsername,
  };

  const user_activityCollection = mongoClient.db(mongoDbName).collection('user_activity');

  user_activityCollection.findOneAndUpdate(
      {activityID: activityID, InveniRAstdID: InveniRAstdID},
      {$set: userActivity},
      {upsert: true, returnOriginal: false},
      (err, result) => {
        if (err) {
          console.error(err);
          console.log('ERRO!!!');
          return;
        }
        console.log('Instância da atividade do aluno criada ou atualizada!');
      },
  );

  createAnalytics(activityID, InveniRAstdID, DiscordUsername, DiscordChID, req, res);
});

/**
 * @swagger
 * paths:
 *  /analytics_url:
 *    post:
 *      summary: Devolve as analiticas de todos os alunos, recolhidas para a atividade identificada (activityID)
 *      tags: [5. Show All Activity Analytics]
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                        activityID:
 *                            type: string
 *                      example:
 *                        {
 *                            "activityID": 1
 *                        }
 *      responses:
 *        '200':
 *          description: Devolve todas as analíticas recolhidas para a atividade
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  activityID:
 *                    type: integer
 *                  analytics:
 *                    type: array
 *                    items:
 *                      type: object
 *                      properties:
 *                        InveniRAstdID:
 *                            type: string
 *                        quantAnalytics:
 *                            type: object
 *                            properties:
 *                                MsgDiscord:
 *                                    type: boolean
 *                                NumDiscord:
 *                                    type: integer
 *                                MsgSlack:
 *                                    type: boolean
 *                                NumSlack:
 *                                    type: integer
 *                        qualAnalytics:
 *                            type: object
 *                            properties:
 *                                DtUltMsgDiscord:
 *                                    type: string
 *                                DtUltMsgSlack:
 *                                    type: string
 */

// webservice que devolve a lista de analíticas recolhidas de uma determinada atividade (no corpo do pedido POST)
app.post('/analytics_url', (req, res) => {
  const actID = req.body.activityID;
  const analyticsCollection = mongoClient.db(mongoDbName).collection('analytics');
  analyticsCollection.find({activityID: actID}).toArray((err, docs) => {
    if (err) {
      console.error(err);
      res.sendStatus(500);
      return;
    }
    console.log(docs);
    res.send(`
      <h1>Analytics</h1>
      <table>
        <tr>
          <th>Atividade</th>
          <th>Aluno</th>
          <th>Discord?</th>
          <th>N.º Msg Discord</th>
          <th>Data Ultima Mensagem Discord</th>
          <th>Slack?</th>
          <th>N.º Msg Slack</th>
          <th>Data Ultima Mensagem Slack</th>
        </tr>
        ${docs.map((doc) =>
    ` <tr>
            <td>${doc.activityID}</td>
            <td>${doc.InveniRAstdID}</td>
            <td>${doc.quantAnalytics.MsgDiscord}</td>
            <td>${doc.quantAnalytics.NumDiscord}</td>
            <td>${doc.qualAnalytics.DtUltMsgDiscord}</td>
            <td>${doc.quantAnalytics.MsgSlack}</td>
            <td>${doc.quantAnalytics.NumSlack}</td>
            <td>${doc.qualAnalytics.DtUltMsgSlack}</td>
          </tr>
        `).join('')}
      </table>
    `);
  });
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
  console.log('http://localhost:3000/');
});


// comunica com a API do Discord e extrai as mensagens do canal do Discord configurado da atividade do utilizado do aluno identificado na atividade
async function createAnalytics(activityID, InveniRAstdID, DiscordUsername, DiscordChID, req, res) {
  const analyticsCollection = mongoClient.db(mongoDbName).collection('analytics');
  const activity = {
    activityID: activityID,
    InveniRAstdID: InveniRAstdID,
  };
  analyticsCollection.updateOne(
      activity,
      {$set: activity},
      {upsert: true}, async (err, result) => {
        if (err) {
          console.error(err);
          res.sendStatus(500);
          return;
        }
        await checkDiscordAPI(activity, DiscordUsername, DiscordChID, res);
      },
  );
}

// Conexão à API do Discord e extrai as mensagens do aluno no canal configurado em jsonParams
async function checkDiscordAPI(activity, DiscordUsername, DiscordChID, res) {
  const discordClient = new Discord.Client({intents: 32767});
  discordClient.login(process.env.DISCORD_TOKEN);
  discordClient.on('ready', () => {
    const channel = discordClient.channels.cache.get(DiscordChID);
    if (!channel) {
      const analyticsCollection = mongoClient.db(mongoDbName).collection('analytics');
      analyticsCollection.updateOne(
          activity,
          {
            $set: {
              quantAnalytics: {
                MsgDiscord: false,
                NumDiscord: 0,
                MsgSlack: false,
                NumSlack: 0,
              },
              qualAnalytics: {
                DtUltMsgDiscord: null,
                DtUltMsgSlack: null,
              },
            },
          });
      res.send(`Could not find channel with ID: <b>${DiscordChID}</b>`);
      return;
    }
    channel.messages.fetch({limit: 100}).then((messages) => {
      const filteredMessages = messages.filter((message) => message.author.username === DiscordUsername);
      const MsgDiscord = filteredMessages.size > 0;
      const NumDiscord = filteredMessages.size;
      let DtUltMsgDiscord = null;
      if (NumDiscord > 0) {
        TempDate = filteredMessages.sort((a, b) => b.createdTimestamp - a.createdTimestamp).first().createdTimestamp;
        date = new Date(TempDate);
        DtUltMsgDiscord = date.toLocaleDateString('en-GB');
      }
      const analyticsCollection = mongoClient.db(mongoDbName).collection('analytics');
      analyticsCollection.updateOne(
          activity,
          {
            $set: {
              quantAnalytics: {
                MsgDiscord: MsgDiscord,
                NumDiscord: NumDiscord,
                MsgSlack: false,
                NumSlack: 0,
              },
              qualAnalytics: {
                DtUltMsgDiscord: DtUltMsgDiscord,
                DtUltMsgSlack: null,
              },
            },
          },
          (err, result) => {
            if (err) {
              console.error(err);
              res.sendStatus(500);
              return;
            }
            console.log(activity);
            res.send('Atividade realizada com sucesso!');
          },
      );
      activityAnalytics = {
        activityID: activity.activityID,
        InveniRAstdID: activity.InveniRAstdID,
        quantAnalytics: {
          MsgDiscord: MsgDiscord,
          NumDiscord: NumDiscord,
          MsgSlack: false,
          NumSlack: 0,
        },
        qualAnalytics: {
          DtUltMsgDiscord: DtUltMsgDiscord,
          DtUltMsgSlack: '',
        },
      };
      console.log(activityAnalytics);
      return activityAnalytics;
    }).catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
  });
}

// padrão de criação Prototype
function Activity(DiscordChID, SlackChID) {
  this.DiscordChID = DiscordChID;
  this.SlackChID = SlackChID;
}

Activity.prototype.getJsonParams = function() {
  return {
    DiscordChID: this.DiscordChID,
    SlackChID: this.SlackChID,
  };
};

// padrão de estrutura Decorator
function ActivityDecorator(activity, updateCount=0) {
  this.activity = activity;
  this.updateCount = updateCount;
}

ActivityDecorator.prototype.update = function() {
  console.log('I was here!');
  this.updateCount++;
  this.activity.update();
};

ActivityDecorator.prototype.getUpdatesCount = function() {
  console.log('I was ALSO here!');
  return this.updateCount;
};

// padrão de comportamento Observer
function ActivitySubject() {
  this.observers = [];
}

ActivitySubject.prototype.addObserver = function(observer) {
  this.observers.push(observer);
};

ActivitySubject.prototype.removeObserver = function(observer) {
  const index = this.observers.indexOf(observer);
  if (index !== -1) {
    this.observers.splice(index, 1);
  }
};

ActivitySubject.prototype.notifyObservers = function(param, newId) {
  this.observers.forEach((observer) => {
    observer.param = param;
    observer.newId = newId;
    observer.update(param, newId);
  });
};

function ActivityObserver(param, newId) {
  this.update = function(param, newId) {
    console.log('newId 1:', newId);
    if (this.param === 'create') {
      console.log(`Uma nova atividade foi criada com o ID: ${newId}.`);
    } else if (this.param === 'update') {
      console.log(`A atividade com o ID: ${newId} foi atualizada.`);
    } else {
      console.log('Erro!');
    }
  };
}

// cria uma instância do ActivitySubject
const activitySubject = new ActivitySubject();

// Observadores
const observer = new ActivityObserver();
activitySubject.addObserver(observer);


// implementação dos padrões de criação Prototype, de estrutura Decorator e de comportamento Observer
async function generateActivityId(DiscordChID, SlackChID) {
  const activity = new ActivityDecorator(new Activity(DiscordChID, SlackChID));
  const activitiesCollection = mongoClient.db(mongoDbName).collection('activities');
  // verifica se existe uma atividade com os mesmos parametros
  let result = await activitiesCollection.findOne({jsonParams: {DiscordChID: activity.activity.DiscordChID, SlackChID: activity.activity.SlackChID}});
  if (result) {
    // incrementar o contador de atualizações
    activity.updateCount = result.updateCount + 1;
    // atualizar o documento
    activitiesCollection.updateOne(
        {activityID: result.activityID},
        {$set: {jsonParams: {DiscordChID: activity.activity.DiscordChID, SlackChID: activity.activity.SlackChID}, activityID: result.activityID, updateCount: activity.updateCount}},
    );
    activitySubject.notifyObservers('update', result.activityID); // Notificar os Observadores que uma atividade foi criado
    return result.activityID;
  } else {
    // verifica qual o último activityID e cria um novo valor
    result = await activitiesCollection.find({}, {activityID: 1}).sort({activityID: -1}).limit(1).toArray();
    let maxActivityId = 999;
    if (result.length > 0) {
      maxActivityId = Number(result[0].activityID);
    }
    const newId = maxActivityId + 1;
    activity.updateCount = 0;
    await activitiesCollection.insertOne({activityID: newId, jsonParams: {DiscordChID: activity.activity.DiscordChID, SlackChID: activity.activity.SlackChID}, updateCount: 0});
    activitySubject.notifyObservers('create', newId); // Notificar os Observadores que uma atividade foi criado
    return newId;
  };
}

