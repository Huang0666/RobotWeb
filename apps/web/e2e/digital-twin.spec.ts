import { expect, test } from "@playwright/test";

test("renders the industrial inspection console and supports patrol controls", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("RobotWeb")).toBeVisible();
  await expect(page.getByText("机器狗工业巡检控制台")).toBeVisible();
  await expect(page.getByText("接口 已连接")).toBeVisible({ timeout: 10_000 });
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const viewportHeight = window.innerHeight;
        return (
          document.documentElement.scrollHeight <= viewportHeight + 1 &&
          document.body.scrollHeight <= viewportHeight + 1
        );
      }),
    )
    .toBe(true);

  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible();
  const canvasWidth = await canvas.evaluate((element) => (element as HTMLCanvasElement).width);
  expect(canvasWidth).toBeGreaterThan(0);
  await page.waitForTimeout(1_000);

  const canvasScreenshot = await canvas.screenshot();
  expect(canvasScreenshot.byteLength).toBeGreaterThan(10_000);

  await page.getByRole("button", { name: "运行巡检" }).click();
  await expect(page.getByText(/个节点/)).toBeVisible();

  const routeName = `端到端巡检 ${Date.now()}`;
  await page.getByLabel("路线名称").fill(routeName);
  await page.getByRole("button", { name: "保存路线" }).click();
  await expect(page.getByRole("button", { name: new RegExp(routeName) })).toBeVisible();

  await page.getByRole("button", { name: "前进" }).click();
  await expect(page.locator("dd").filter({ hasText: /^手动控制$/ })).toBeVisible();

  await page.getByRole("button", { name: "复位机器人" }).click();
  await expect(page.locator("dd").filter({ hasText: /^待命$/ })).toBeVisible();
});
