import { parentPort, workerData } from 'worker_threads';
import { Consumer, Kafka, logLevel } from 'kafkajs';
import { identifyKafkaError } from './kafka-error-detection';

async function runConsumer() {
    let { project_id, connectionString, username, password, topics } = workerData;
    
    let kafka = createKafkaInstance(connectionString, username, password);
    let consumer = kafka.consumer({ groupId: `logix-${project_id}` });

    try {
        await connectAndSubscribe(consumer, topics);
        await runConsumerLoop(consumer, project_id);
    } catch (err) {
        console.log(err);
        handleConsumerError(err, project_id);
    }
}

function createKafkaInstance(connectionString, username, password) {
    return new Kafka({
        brokers: [connectionString],
        // ssl: true,
        // sasl: {
        //     mechanism: 'plain',
        //     username: username,
        //     password: password,
        // },
        // connectionTimeout: 3000,
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

async function connectAndSubscribe(consumer: Consumer, topics) {
    await consumer.connect();
    for (let topic of topics) {
        await consumer.subscribe({ topic: topic }).then(()=>{
            console.log("Subscribed to topic: ",topic);
            parentPort.postMessage({type: 'online_topic_status', data: topic});
        }).catch(err => {
            let val = identifyKafkaError(err);
            console.log("Error to topic: ",topic);
            val.description = `Topic: ${topic} is not defined in the broker. Please make sure that the topic is handled correctly in all the groups.`;
            parentPort.postMessage({type: 'offline_topic_status', data: topic});
            parentPort.postMessage({ type: 'info_log', data: val.description });
        });
    }
    parentPort.postMessage({type: 'status_done', data: "Completed"});
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
        throw event.payload.error;
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
    console.log('Consumer error:', err);
    process.exit(1);
});
