import { parentPort, workerData } from 'worker_threads';
import { Kafka, logLevel } from 'kafkajs';
import { identifyKafkaError } from './kafka-error-detection';

async function runConsumer() {
    let { project_id, connectionString, username, password, topics } = workerData;
    
    let kafka = createKafkaInstance(connectionString, username, password);
    let consumer = kafka.consumer({ groupId: `logix-${project_id}` });

    try {
        await connectAndSubscribe(consumer, topics);
        await runConsumerLoop(consumer, project_id);
    } catch (err) {
        handleConsumerError(err, project_id);
    }
}

function createKafkaInstance(connectionString, username, password) {
    return new Kafka({
        brokers: [connectionString],
        ssl: true,
        sasl: {
            mechanism: 'plain',
            username: username,
            password: password,
        },
        connectionTimeout: 3000,
        logLevel: logLevel.INFO,
        retry: {
            'retries': 6
        },
        logCreator: createLogCreator
    });
}

function createLogCreator() {
    return ({ namespace, level, label, log }) => {
        const { message } = log;
        parentPort.postMessage({
            type: 'info_log',
            data: `[${namespace}] ${message}`
        });
    };
}

async function connectAndSubscribe(consumer, topics) {
    await consumer.connect();
    for (let topic of topics) {
        await consumer.subscribe({ topic: topic }).catch(err => {
            let val = identifyKafkaError(err);
            val.description = `Topic: ${topic} is not defined in the broker. Please make sure that the topic is handled correctly in all the groups.`;
            parentPort.postMessage({ type: 'info_log', data: val.description });
        });
    }
}

async function runConsumerLoop(consumer, project_id) {
    setupConsumerEventListeners(consumer);
    
    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            let kafkaDto = {
                key: "testing",
                value: JSON.parse(message.value.toString()),
                partition: partition,
                topic: topic,
                timestamp: message.timestamp.toString()
            };
            console.log(kafkaDto);
            parentPort.postMessage({ type: 'newLog', project_id, data: kafkaDto });
        }
    });
}

function setupConsumerEventListeners(consumer) {
    consumer.on("consumer.connect", (event) => {
        console.log("TEST " + event.type + " " + event.payload);
    });

    consumer.on("consumer.crash", (event) => {
        console.log("TEST2 " + event.type + " " + event.payload.error.message + " " + event.payload.error.name);
        if (event.payload.error.name === "KafkaJSNumberOfRetriesExceeded") {
            throw event.payload.error;
        }
    });

    consumer.on("consumer.disconnect", (event) => {
        console.log("TEST3 " + event.type + " " + event.payload);
    });

    consumer.on("consumer.stop", (event) => {
        console.log("TEST4 " + event.type + " " + event.payload);
    });
}

function handleConsumerError(err, project_id) {
    parentPort.postMessage({ type: 'error', project_id, data: err });
    throw err;
}

runConsumer().catch(err => {
    console.error('Consumer error:', err);
    process.exit(1);
});
