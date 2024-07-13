export class KafkaMessageDto {
    key: string;
    value: Map<string, any> | number | string;
    timestamp : string;
    topic: string;
    partition: number;
}