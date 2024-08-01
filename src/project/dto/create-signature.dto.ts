import { User } from "src/global-guard/interface/userId.interface";

export class CreateStackSignatureDto implements User{
    userId: string;
    sId: string;
    topic: string;
    key?: string;
    schema: Record<string, any>;
}