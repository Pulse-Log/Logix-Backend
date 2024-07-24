import { parentPort, workerData } from 'worker_threads';
import { Kafka } from 'kafkajs';
import { identifyKafkaError } from './kafka-error-detection';

async function runConsumer() {
    let { project_id, connectionString, username, password, topics } = workerData;

    console.log(topics);
    console.log(connectionString);
    console.log(username);
    console.log(password);
    let kafka = new Kafka({
        brokers: [connectionString],
        ssl: true,
        sasl: {
            mechanism: 'plain',
            username: username,
            password: password,
        }
    });

    let consumer = kafka.consumer({ groupId: `logix-${project_id}` });

    try {
        await consumer.connect();

        for (let topic of topics) {
            await consumer.subscribe({ topic: topic }).catch(err => {
                let val = identifyKafkaError(err);
                val.description = `Topic: [${topic}] is not defined in the broker. Please make sure that the topic is handled correctly in all the groups.`;
                parentPort.postMessage({ type: 'error', project_id, data: val });
            });
        }

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
    } catch (err) {
        let val = identifyKafkaError(err);
        parentPort.postMessage({ type: 'error', project_id, data: val });
        throw err;
    }
}

runConsumer().catch(err => {
    console.error('Consumer error:', err);
    process.exit(1);
});