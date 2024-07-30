import { User } from "src/global-guard/interface/userId.interface";

export class CreateComponentDto implements User{
    userId: string;
    name: string;
    description: string;
    dataPath: string;
    signatureId: string;
    viewerId: string;
    sId: string;
}