/** Web builds do not register for native push in this project. */
export async function registerForExpoPushAsync(): Promise<string | null> {
  return null;
}
