import { User } from "src/global-guard/interface/userId.interface";

export class CommonUserIdDto implements User{
    userId: string;
}