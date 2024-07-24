import { User } from "src/global-guard/interface/userId.interface";

export class UpdateStackDto implements User {
    userId: string;
    name: string;
    description: string;
}