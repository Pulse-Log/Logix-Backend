export class CreateProjectGroupDto {
    name: string;
    project_id: string;
    identify: CreateIdentificationGroupDto[];
}

export class CreateIdentificationGroupDto {
    topic_name: string;
    key: string;
    schema: Record<string, any>;
}