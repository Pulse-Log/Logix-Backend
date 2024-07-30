import { User } from "src/global-guard/interface/userId.interface";

export class CreateProjectStackDto implements User {
    userId: string;
    name: string;
    description: string;
    projectId: string;
    signatures: CreateSignaturesDto[];
}

export class CreateSignaturesDto {
    topic : string;
    key?: string;
    schema: Record<string, any>;
}