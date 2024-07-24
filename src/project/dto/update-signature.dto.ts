import { User } from "src/global-guard/interface/userId.interface";

export class UpdateSignaturesDto implements User {
    userId: string;
    value : string;
    key?: string;
    schema: Record<string, any>;
}