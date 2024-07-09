export class CreateProjectGroupDto {
    groupName: string;
    projectId: number;
    identifications: CreateIdentificationGroupDto[];
}

export class CreateIdentificationGroupDto {
    topicName: string;
    key: string;
    schema: JSON;
}