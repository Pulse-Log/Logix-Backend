import { 
    KafkaJSError, 
    KafkaJSNonRetriableError,
    KafkaJSConnectionError,
    KafkaJSRequestTimeoutError,
    KafkaJSTopicMetadataNotLoaded,
    KafkaJSNumberOfRetriesExceeded,
    KafkaJSOffsetOutOfRange,
    KafkaJSBrokerNotFound,
    KafkaJSPartialMessageError,
    KafkaJSSASLAuthenticationError,
    KafkaJSProtocolError
  } from 'kafkajs';
  
  export interface KafkaErrorDetails {
    errorType: string;
    errorCode?: string;
    description: string;
    retriable: boolean;
    suggestedAction: string;
  }
  
  export function identifyKafkaError(error: Error): KafkaErrorDetails {
    let errorDetails: KafkaErrorDetails = {
      errorType: 'UnknownError',
      description: 'An unknown error occurred',
      retriable: false,
      suggestedAction: 'Check the error logs and Kafka cluster status'
    };
  
    if (error instanceof KafkaJSError) {
      errorDetails.errorCode = (error as any).code;
      
      if (error instanceof KafkaJSNonRetriableError) {
        errorDetails.errorType = 'NonRetriableError';
        errorDetails.description = 'A non-retriable error occurred';
        errorDetails.retriable = false;
        errorDetails.suggestedAction = 'Check Kafka cluster configuration and network connectivity';
      }
      
      if (error instanceof KafkaJSConnectionError) {
        errorDetails.errorType = 'ConnectionError';
        errorDetails.description = 'Failed to connect to Kafka broker';
        errorDetails.retriable = true;
        errorDetails.suggestedAction = 'Verify broker addresses and network connectivity';
      }
      
      if (error instanceof KafkaJSRequestTimeoutError) {
        errorDetails.errorType = 'RequestTimeoutError';
        errorDetails.description = 'Request to Kafka broker timed out';
        errorDetails.retriable = true;
        errorDetails.suggestedAction = 'Check network latency and increase timeout settings if necessary';
      }
      
      if (error instanceof KafkaJSTopicMetadataNotLoaded) {
        errorDetails.errorType = 'TopicMetadataNotLoaded';
        errorDetails.description = 'Topic metadata could not be loaded';
        errorDetails.retriable = true;
        errorDetails.suggestedAction = 'Verify topic exists and check broker connectivity';
      }
      
      if (error instanceof KafkaJSNumberOfRetriesExceeded) {
        errorDetails.errorType = 'NumberOfRetriesExceeded';
        errorDetails.description = 'Maximum number of retries exceeded';
        errorDetails.retriable = false;
        errorDetails.suggestedAction = 'Investigate the root cause of failures and consider increasing retry limits';
      }
      
      if (error instanceof KafkaJSOffsetOutOfRange) {
        errorDetails.errorType = 'OffsetOutOfRange';
        errorDetails.description = 'Requested offset is out of range';
        errorDetails.retriable = false;
        errorDetails.suggestedAction = 'Adjust consumer group offset or use auto.offset.reset configuration';
      }
      
      if (error instanceof KafkaJSBrokerNotFound) {
        errorDetails.errorType = 'BrokerNotFound';
        errorDetails.description = 'Specified broker not found in cluster metadata';
        errorDetails.retriable = true;
        errorDetails.suggestedAction = 'Verify broker configuration and cluster health';
      }
      
      if (error instanceof KafkaJSPartialMessageError) {
        errorDetails.errorType = 'PartialMessageError';
        errorDetails.description = 'Received a partial message';
        errorDetails.retriable = true;
        errorDetails.suggestedAction = 'Check for network issues or increase fetch.max.bytes configuration';
      }
      
      if (error instanceof KafkaJSSASLAuthenticationError) {
        errorDetails.errorType = 'SASLAuthenticationError';
        errorDetails.description = 'SASL authentication failed';
        errorDetails.retriable = false;
        errorDetails.suggestedAction = 'Verify SASL credentials and mechanism configuration';
      }
      
      if (error instanceof KafkaJSProtocolError) {
        errorDetails.errorType = 'ProtocolError';
        errorDetails.description = 'Kafka protocol error occurred';
        errorDetails.retriable = false;
        errorDetails.suggestedAction = 'Check for version mismatches between client and broker';
  
        // Check for specific error codes related to topic subscription
        if (errorDetails.errorCode === 'UNKNOWN_TOPIC_OR_PARTITION') {
          errorDetails.errorType = 'UnknownTopicOrPartition';
          errorDetails.description = 'The topic does not exist or is not available';
          errorDetails.retriable = false;
          errorDetails.suggestedAction = 'Verify the topic name and ensure it exists on the Kafka cluster';
        }
      }
      
    //   if (error instanceof KafkaJSInvalidQuorum) {
    //     errorDetails.errorType = 'InvalidQuorum';
    //     errorDetails.description = 'Invalid quorum in the Kafka cluster';
    //     errorDetails.retriable = false;
    //     errorDetails.suggestedAction = 'Verify cluster health and ensure enough brokers are available';
    //   }
    }
  
    return errorDetails;
  }