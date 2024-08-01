import { User } from "src/global-guard/interface/userId.interface";
export class GetUserProjectDto implements User {
    userId: string;
}