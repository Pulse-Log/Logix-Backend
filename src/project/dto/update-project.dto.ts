import { User } from "src/global-guard/interface/userId.interface";
class UpdateSourceDto {
    configuration: Record<string, any>;
    debugMode: boolean;
}
class Settings {
    numberOfLogs: number;
    connectionTimeout: number;
}
export class UpdateProjectDto implements User {
    userId: string;
    name: string;
    description: string;
    source: UpdateSourceDto;
    settings: Settings;
}
